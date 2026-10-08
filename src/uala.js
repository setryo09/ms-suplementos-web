// Integración con Ualá Bis — API Cobros Online v2 (solo servidor).
// Documentación: https://developers.ualabis.com.ar/v2
// Las credenciales (UALA_USERNAME, UALA_CLIENT_ID, UALA_CLIENT_SECRET) viven
// como secretos de Cloudflare y nunca se envían al navegador.
//
// Ualá no firma los webhooks: por eso nunca usamos el contenido del aviso,
// sino que consultamos la orden a la API de Ualá con nuestro token.

const HOSTS = {
  stage: {
    auth: "https://auth.stage.developers.ar.ua.la/v2/api",
    checkout: "https://checkout.stage.developers.ar.ua.la/v2/api",
  },
  production: {
    auth: "https://auth.developers.ar.ua.la/v2/api",
    checkout: "https://checkout.developers.ar.ua.la/v2/api",
  },
};

// Monto mínimo que acepta Ualá: $25.
export const UALA_MIN_TOTAL = 25;

function hosts(env) {
  return env.UALA_ENV === "production" ? HOSTS.production : HOSTS.stage;
}

// La documentación indica el monto "en centavos" como texto ("3005" = $30,05),
// pero algunos ejemplos usan "10.90". UALA_AMOUNT_FORMAT permite ajustarlo si
// la prueba en el entorno de test muestra otro monto en el checkout de Ualá.
export function toUalaAmount(env, totalPesos) {
  if (env.UALA_AMOUNT_FORMAT === "pesos") return totalPesos.toFixed(2);
  return String(Math.round(totalPesos * 100));
}

export function fromUalaAmount(env, amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return NaN;
  return env.UALA_AMOUNT_FORMAT === "pesos" ? Math.round(n) : Math.round(n) / 100;
}

let cachedToken = null; // { value, expiresAt, env }

async function getToken(env) {
  const key = env.UALA_ENV || "stage";
  if (cachedToken && cachedToken.env === key && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const res = await fetch(`${hosts(env).auth}/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      username: env.UALA_USERNAME,
      client_id: env.UALA_CLIENT_ID,
      client_secret_id: env.UALA_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.access_token) {
    throw new Error(`Ualá auth -> HTTP ${res.status}`);
  }
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + (Number(body.expires_in) || 3600) * 1000,
    env: key,
  };
  return cachedToken.value;
}

async function ualaFetch(env, path, init = {}) {
  const token = await getToken(env);
  const res = await fetch(`${hosts(env).checkout}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // No logueamos el cuerpo: puede traer datos del comprador.
    throw new Error(`Ualá ${init.method || "GET"} ${path.split("?")[0]} -> HTTP ${res.status}`);
  }
  return body;
}

// Crea la orden de pago por el TOTAL calculado por el servidor.
export async function createUalaOrder(env, order) {
  const base = env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  const returnUrl = `${base}/pedido.html?n=${encodeURIComponent(order.orderNumber)}&t=${order.publicToken}`;
  const body = await ualaFetch(env, "/checkout", {
    method: "POST",
    body: JSON.stringify({
      amount: toUalaAmount(env, order.total),
      description: `Pedido ${order.orderNumber} - ${env.BUSINESS_NAME || "MYS Suplementos"}`.slice(0, 120),
      callback_success: returnUrl,
      callback_fail: returnUrl,
      notification_url: `${base}/api/webhooks/uala`,
      external_reference: order.orderNumber,
    }),
  });
  if (!body?.uuid || !body?.links?.checkout_link) throw new Error("Ualá: respuesta sin uuid o checkout_link");
  return { uuid: body.uuid, checkoutUrl: body.links.checkout_link };
}

export async function getUalaOrder(env, uuid) {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(String(uuid))) throw new Error("uuid de Ualá inválido");
  return ualaFetch(env, `/orders/${encodeURIComponent(uuid)}`);
}
