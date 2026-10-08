// Servidor de MYS Suplementos (Cloudflare Worker).
// - Sirve el sitio estático de /public.
// - /api/*: cotización, pedidos, estado, webhook de Mercado Pago y exportación CSV.
// - El registro oficial de pedidos es la base D1.
//
// Toda la lógica de dinero (precios, descuentos, totales, estado de pago)
// se resuelve acá. El navegador solo envía ids, cantidades y datos de contacto.

import { priceItems, buildQuote, normalizeCode, ValidationError } from "./pricing.js";
import { createPreference, getPayment, verifyWebhookSignature } from "./mercadopago.js";
import { ordersToCsv } from "./export.js";
import { shippingFor } from "./shipping.js";
import { PAYMENT, ORDER, paymentStatusFromMercadoPago } from "./statuses.js";
import {
  json,
  errorJson,
  readJson,
  sha256Hex,
  safeEqual,
  randomToken,
  formatOrderNumber,
  parseOrderNumber,
  isMercadoPagoConfigured,
} from "./util.js";

const ZONES = ["CABA", "GBA", "Otra"];
const PAYMENT_METHODS = ["mercadopago", "whatsapp"];
const RETRYABLE = new Set([PAYMENT.WAITING, PAYMENT.REJECTED, PAYMENT.CANCELLED]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    try {
      return await route(request, env, url);
    } catch (err) {
      if (err instanceof ValidationError) return errorJson(err.message, 422, err.code);
      console.error("Error no controlado:", err && err.message);
      return errorJson("Ocurrió un error inesperado. Probá de nuevo en unos minutos.", 500, "server_error");
    }
  },
};

async function route(request, env, url) {
  const { pathname } = url;
  const method = request.method;

  if (pathname === "/api/config" && method === "GET") {
    return json({ ok: true, mercadoPago: isMercadoPagoConfigured(env) });
  }
  if (pathname === "/api/quote" && method === "POST") return handleQuote(request, env);
  if (pathname === "/api/orders" && method === "POST") return handleCreateOrder(request, env);
  if (pathname === "/api/orders/status" && method === "GET") return handleOrderStatus(env, url);
  if (pathname === "/api/webhooks/mercadopago" && method === "POST") return handleMercadoPagoWebhook(request, env, url);
  if (pathname === "/api/admin/orders.csv" && method === "GET") return handleOrdersCsv(request, env);

  return errorJson("No encontrado.", 404, "not_found");
}

/* ---------- Códigos de creador ---------- */

async function findCreatorCode(env, rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return { code: "", row: null };
  if (!/^[A-Z0-9_-]{2,40}$/.test(code)) return { code, row: null };
  const row = await env.DB.prepare("SELECT code, creator_name, active FROM creator_codes WHERE code = ?1")
    .bind(code)
    .first();
  return { code, row: row ? { code: row.code.toUpperCase(), active: row.active === 1 } : null };
}

function codeFeedback(code, row) {
  if (!code) return { status: "none" };
  if (row && row.active) return { status: "applied", message: "Código aplicado: 10% de descuento." };
  return { status: "invalid", message: "El código no existe o no está activo. No se aplicó descuento." };
}

/* ---------- Cotización ---------- */

async function handleQuote(request, env) {
  const body = await readJson(request);
  if (!body) return errorJson("Solicitud inválida.");
  const lines = priceItems(body.items);
  const { code, row } = await findCreatorCode(env, body.creatorCode);
  const quote = buildQuote(lines, row);
  const zone = ZONES.includes(body.zone) ? body.zone : null;
  const shipping = zone ? shippingFor(zone, quote.subtotal) : null;
  return json({ ok: true, quote, code: codeFeedback(code, row), shipping });
}

/* ---------- Pedidos ---------- */

function clean(value, max) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function validateCustomer(raw) {
  const name = clean(raw?.name, 80);
  const phone = clean(raw?.phone, 30).replace(/[^\d+]/g, "");
  const email = clean(raw?.email, 120).toLowerCase();
  const zone = clean(raw?.zone, 10);
  const notes = clean(raw?.notes, 300);

  if (name.length < 2) throw new ValidationError("Ingresá tu nombre.", "invalid_name");
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) throw new ValidationError("Ingresá un WhatsApp o teléfono válido.", "invalid_phone");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new ValidationError("El email no es válido.", "invalid_email");
  if (!ZONES.includes(zone)) throw new ValidationError("Elegí tu zona.", "invalid_zone");
  return { name, phone, email: email || null, zone, notes: notes || null };
}

function orderResponse(env, order, extra = {}) {
  return json({
    ok: true,
    orderNumber: formatOrderNumber(env, order.id),
    publicToken: order.public_token,
    paymentMethod: order.payment_method,
    subtotal: order.subtotal,
    creatorCode: order.creator_code,
    discount: order.discount,
    total: order.total,
    shippingStatus: order.shipping_status,
    shippingCost: order.shipping_cost,
    items: JSON.parse(order.items_json),
    checkoutUrl: order.payment_method === "mercadopago" ? order.mp_init_point : null,
    ...extra,
  });
}

async function ensurePreference(env, order) {
  if (order.payment_method !== "mercadopago" || order.mp_init_point) return order;
  const pref = await createPreference(env, {
    orderNumber: formatOrderNumber(env, order.id),
    publicToken: order.public_token,
    total: order.total,
    lines: JSON.parse(order.items_json),
    customerEmail: order.customer_email,
    customerName: order.customer_name,
  });
  await env.DB.prepare("UPDATE orders SET mp_preference_id = ?2, mp_init_point = ?3 WHERE id = ?1")
    .bind(order.id, pref.id, pref.initPoint)
    .run();
  return { ...order, mp_preference_id: pref.id, mp_init_point: pref.initPoint };
}

async function respondExisting(env, existing, requestHash) {
  if (existing.request_hash !== requestHash) {
    return errorJson("Este intento de compra ya se usó con otros datos. Recargá la página.", 409, "idempotency_conflict");
  }
  try {
    return orderResponse(env, await ensurePreference(env, existing), { duplicate: true });
  } catch (err) {
    console.error("Mercado Pago (reintento):", err.message);
    return errorJson(
      "Tu pedido quedó registrado pero no pudimos abrir Mercado Pago. Probá de nuevo o coordiná por WhatsApp.",
      502,
      "payment_unavailable",
      { orderNumber: formatOrderNumber(env, existing.id) }
    );
  }
}

async function handleCreateOrder(request, env) {
  const body = await readJson(request);
  if (!body) return errorJson("Solicitud inválida.");

  const key = String(body.idempotencyKey || "");
  if (!/^[A-Za-z0-9-]{16,64}$/.test(key)) return errorJson("Solicitud inválida.", 400, "invalid_key");

  const paymentMethod = String(body.paymentMethod || "");
  if (!PAYMENT_METHODS.includes(paymentMethod)) return errorJson("Elegí un medio de pago.", 400, "invalid_payment_method");
  if (paymentMethod === "mercadopago" && !isMercadoPagoConfigured(env)) {
    return errorJson("El pago online todavía no está disponible. Elegí coordinar por WhatsApp.", 400, "mp_not_configured");
  }

  const customer = validateCustomer(body.customer);
  const lines = priceItems(body.items);
  const { code, row } = await findCreatorCode(env, body.creatorCode);
  const feedback = codeFeedback(code, row);
  const quote = buildQuote(lines, row);

  if (feedback.status === "invalid") {
    return errorJson(feedback.message, 422, "invalid_code", { quote });
  }
  // El cliente confirma un total; si el servidor calcula otro (cambió un
  // precio, se desactivó el código), se lo mostramos antes de cobrar.
  if (body.expectedTotal !== quote.total) {
    return errorJson("El total se actualizó. Revisalo antes de confirmar.", 409, "total_changed", { quote });
  }

  // El envío por moto a GBA se cotiza con Uber en el momento y se confirma
  // por WhatsApp: no se puede cobrar online hasta tener esa cotización.
  const shipping = shippingFor(customer.zone, quote.subtotal);
  if (shipping.pendingQuote && paymentMethod === "mercadopago") {
    return errorJson(
      "El envío a tu zona se cotiza al momento por WhatsApp. Elegí \"Coordinar por WhatsApp\" y te confirmamos el costo antes de cobrar.",
      422,
      "shipping_quote_required",
      { shipping }
    );
  }

  const requestHash = await sha256Hex(
    JSON.stringify({ lines: quote.lines.map((l) => [l.productId, l.variantId, l.quantity]), code: quote.creatorCode, paymentMethod, customer })
  );

  const existing = await env.DB.prepare("SELECT * FROM orders WHERE idempotency_key = ?1").bind(key).first();
  if (existing) return respondExisting(env, existing, requestHash);

  const isMP = paymentMethod === "mercadopago";
  const inserted = await env.DB.prepare(
    `INSERT INTO orders (
       idempotency_key, request_hash, public_token, created_at,
       customer_name, customer_phone, customer_email, customer_zone, customer_notes,
       items_json, subtotal, creator_code, discount, total,
       payment_method, payment_status, order_status,
       shipping_status, shipping_cost
     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING *`
  )
    .bind(
      key,
      requestHash,
      randomToken(),
      new Date().toISOString(),
      customer.name,
      customer.phone,
      customer.email,
      customer.zone,
      customer.notes,
      JSON.stringify(quote.lines),
      quote.subtotal,
      quote.creatorCode,
      quote.discount,
      quote.total,
      paymentMethod,
      isMP ? PAYMENT.WAITING : PAYMENT.TO_ARRANGE,
      isMP ? ORDER.WAITING_PAYMENT : ORDER.TO_ARRANGE,
      shipping.status,
      shipping.cost
    )
    .first();

  // Otro request con la misma clave ganó la carrera: devolvemos ese pedido.
  if (!inserted) {
    const winner = await env.DB.prepare("SELECT * FROM orders WHERE idempotency_key = ?1").bind(key).first();
    return respondExisting(env, winner, requestHash);
  }

  if (!isMP) return orderResponse(env, inserted);
  return respondExisting(env, inserted, requestHash);
}

async function handleOrderStatus(env, url) {
  const id = parseOrderNumber(env, url.searchParams.get("n"));
  const token = url.searchParams.get("t") || "";
  if (!id) return errorJson("Pedido no encontrado.", 404, "not_found");
  const order = await env.DB.prepare(
    "SELECT id, public_token, payment_status, order_status, total, payment_method, mp_init_point, shipping_status FROM orders WHERE id = ?1"
  )
    .bind(id)
    .first();
  if (!order || !safeEqual(order.public_token, token)) return errorJson("Pedido no encontrado.", 404, "not_found");
  return json({
    ok: true,
    orderNumber: formatOrderNumber(env, order.id),
    paymentStatus: order.payment_status,
    orderStatus: order.order_status,
    paid: order.payment_status === PAYMENT.PAID,
    total: order.total,
    paymentMethod: order.payment_method,
    shippingStatus: order.shipping_status,
    // Permite reintentar el pago si el anterior fue rechazado o quedó a medias.
    retryUrl:
      order.payment_method === "mercadopago" && RETRYABLE.has(order.payment_status) ? order.mp_init_point : null,
  });
}

/* ---------- Webhook de Mercado Pago ---------- */

async function handleMercadoPagoWebhook(request, env, url) {
  if (!env.MP_ACCESS_TOKEN) return errorJson("Mercado Pago no configurado.", 503, "mp_not_configured");

  const body = (await readJson(request)) || {};
  const type = url.searchParams.get("type") || body.type || url.searchParams.get("topic");
  const dataId = url.searchParams.get("data.id") || body?.data?.id || url.searchParams.get("id");

  // Firma: si viene, tiene que ser válida. Si no viene, igual es seguro
  // continuar porque nunca usamos el contenido de la notificación: abajo
  // consultamos el pago real a Mercado Pago con nuestro token.
  if (env.MP_WEBHOOK_SECRET && request.headers.get("x-signature")) {
    const valid = await verifyWebhookSignature({
      secret: env.MP_WEBHOOK_SECRET,
      signatureHeader: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
      dataId: url.searchParams.get("data.id"),
    });
    if (!valid) return errorJson("Firma inválida.", 401, "invalid_signature");
  }

  // Solo nos interesan los pagos. Otros avisos se confirman y se ignoran.
  if (type !== "payment" || !dataId) return json({ ok: true, ignored: true });

  // Nunca confiamos en el contenido de la notificación: consultamos el pago
  // directamente a Mercado Pago con nuestro token.
  const payment = await getPayment(env, dataId);
  const orderId = parseOrderNumber(env, payment.external_reference);
  if (!orderId) return json({ ok: true, ignored: "external_reference_desconocida" });

  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?1").bind(orderId).first();
  if (!order) return json({ ok: true, ignored: "pedido_inexistente" });

  const paymentId = String(payment.id);
  const mpStatus = String(payment.status || "");
  const statusDetail = String(payment.status_detail || "");

  const already = await env.DB.prepare(
    "SELECT 1 FROM payment_events WHERE payment_id = ?1 AND status = ?2 AND status_detail = ?3"
  )
    .bind(paymentId, mpStatus, statusDetail)
    .first();
  if (already) return json({ ok: true, duplicate: true });

  let newPaymentStatus = order.payment_status;
  let newOrderStatus = order.order_status;
  let newPaymentId = order.mp_payment_id;
  let newMpStatus = order.mp_status;

  const otherAttemptAfterPaid =
    order.payment_status === PAYMENT.PAID && order.mp_payment_id && order.mp_payment_id !== paymentId;

  if (!otherAttemptAfterPaid) {
    newPaymentStatus = paymentStatusFromMercadoPago(mpStatus);
    if (mpStatus === "approved") {
      const amountOk = Math.round(Number(payment.transaction_amount)) === order.total && payment.currency_id === "ARS";
      newPaymentStatus = amountOk ? PAYMENT.PAID : PAYMENT.REVIEW;
      newPaymentId = paymentId;
      if (amountOk && order.order_status === ORDER.WAITING_PAYMENT) newOrderStatus = ORDER.TO_PREPARE;
    } else if (!newPaymentId || newPaymentId === paymentId) {
      newPaymentId = paymentId;
    }
    newMpStatus = mpStatus;
  }

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE orders SET payment_status = ?2, order_status = ?3, mp_payment_id = ?4, mp_status = ?5
       WHERE id = ?1`
    ).bind(order.id, newPaymentStatus, newOrderStatus, newPaymentId, newMpStatus),
    env.DB.prepare(
      `INSERT INTO payment_events (payment_id, status, status_detail, order_id, received_at)
       VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT DO NOTHING`
    ).bind(paymentId, mpStatus, statusDetail, order.id, new Date().toISOString()),
  ]);

  return json({ ok: true });
}

/* ---------- Exportación CSV (admin) ---------- */

function isAdmin(request, env) {
  const auth = request.headers.get("authorization") || "";
  return Boolean(env.ADMIN_TOKEN) && safeEqual(auth.startsWith("Bearer ") ? auth.slice(7) : "", env.ADMIN_TOKEN);
}

// Todos los pedidos de D1 en un CSV que se abre con Excel.
async function handleOrdersCsv(request, env) {
  if (!env.ADMIN_TOKEN) return errorJson("No encontrado.", 404, "not_found");
  if (!isAdmin(request, env)) return errorJson("No autorizado.", 401, "unauthorized");
  const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY id").all();
  return new Response(ordersToCsv(env, results), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="pedidos.csv"',
      "cache-control": "no-store",
    },
  });
}
