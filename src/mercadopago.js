// Integración con Mercado Pago Checkout Pro (solo servidor).
// El Access Token vive en la variable de entorno MP_ACCESS_TOKEN y nunca
// se envía al navegador.

import { hmacSha256Hex, safeEqual } from "./util.js";

const API = "https://api.mercadopago.com";

async function mpFetch(env, path, init = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // No logueamos el cuerpo completo: puede traer datos del pagador.
    throw new Error(`Mercado Pago ${init.method || "GET"} ${path.split("?")[0]} -> HTTP ${res.status}`);
  }
  return body;
}

// Crea la preferencia de pago. Se cobra el TOTAL calculado por el servidor
// en un único ítem (Checkout Pro no admite ítems con precio negativo para
// representar el descuento).
export async function createPreference(env, order) {
  const base = env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  const returnUrl = `${base}/pedido.html?n=${encodeURIComponent(order.orderNumber)}&t=${order.publicToken}`;

  const body = {
    items: [
      {
        id: order.orderNumber,
        title: `Pedido ${order.orderNumber} - ${env.BUSINESS_NAME || "MYS Suplementos"}`,
        description: order.lines.map((l) => `${l.quantity}x ${l.name}`).join(", ").slice(0, 250),
        quantity: 1,
        unit_price: order.total,
        currency_id: "ARS",
      },
    ],
    external_reference: order.orderNumber,
    notification_url: `${base}/api/webhooks/mercadopago?source_news=webhooks`,
    back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
    auto_return: "approved",
    statement_descriptor: (env.MP_STATEMENT_DESCRIPTOR || "MYS SUPLEMENTOS").slice(0, 22),
    metadata: { order_number: order.orderNumber },
  };
  if (order.customerEmail) body.payer = { email: order.customerEmail, name: order.customerName };

  const pref = await mpFetch(env, "/checkout/preferences", {
    method: "POST",
    headers: { "x-idempotency-key": `pref-${order.orderNumber}` },
    body: JSON.stringify(body),
  });
  return { id: pref.id, initPoint: pref.init_point };
}

export async function getPayment(env, paymentId) {
  if (!/^\d{1,30}$/.test(String(paymentId))) throw new Error("payment id inválido");
  return mpFetch(env, `/v1/payments/${paymentId}`);
}

// Valida el header x-signature según la documentación de Mercado Pago:
// manifest = "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
// firmado con HMAC-SHA256 usando la clave secreta del webhook.
export async function verifyWebhookSignature({ secret, signatureHeader, requestId, dataId }) {
  if (!secret || !signatureHeader) return false;
  let ts = "";
  let v1 = "";
  for (const part of signatureHeader.split(",")) {
    const [k, v] = part.split("=").map((s) => (s || "").trim());
    if (k === "ts") ts = v;
    if (k === "v1") v1 = v;
  }
  if (!ts || !v1) return false;

  let manifest = "";
  if (dataId) manifest += `id:${String(dataId).toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;

  const expected = await hmacSha256Hex(secret, manifest);
  return safeEqual(expected, v1.toLowerCase());
}
