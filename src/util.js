// Utilidades compartidas del servidor.

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

export function errorJson(message, status = 400, code = "error", extra = {}) {
  return json({ ok: false, error: { code, message }, ...extra }, status);
}

export async function readJson(request, maxBytes = 20_000) {
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

export async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

// Comparación en tiempo constante para secretos.
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) {
    diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  }
  return diff === 0;
}

export function randomToken(bytes = 18) {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return toHex(arr);
}

export function orderPrefix(env) {
  return (env.ORDER_PREFIX || "MYS").replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "MYS";
}

// Desplazamiento opcional para que la numeración no empiece en 1
// (ORDER_NUMBER_OFFSET=1000 -> el primer pedido es MYS-01001). Fijalo antes
// del primer pedido y no lo cambies después.
function orderOffset(env) {
  const n = Number(env.ORDER_NUMBER_OFFSET || 0);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

// id 12 -> "MYS-00012". Consecutivo porque el id lo asigna la base.
export function formatOrderNumber(env, id) {
  return `${orderPrefix(env)}-${String(id + orderOffset(env)).padStart(5, "0")}`;
}

// "MYS-00012" -> 12 (o null si no corresponde a este prefijo).
export function parseOrderNumber(env, value) {
  const m = new RegExp(`^${orderPrefix(env)}-(\\d{1,12})$`, "i").exec(String(value || "").trim());
  if (!m) return null;
  const id = Number(m[1]) - orderOffset(env);
  return id > 0 ? id : null;
}

export function formatDateAR(iso) {
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

export function formatARS(value) {
  return "$" + Math.round(value).toLocaleString("es-AR");
}

export function isMercadoPagoConfigured(env) {
  return Boolean(env.MP_ACCESS_TOKEN && env.PUBLIC_BASE_URL);
}

export function isUalaConfigured(env) {
  return Boolean(env.UALA_USERNAME && env.UALA_CLIENT_ID && env.UALA_CLIENT_SECRET && env.PUBLIC_BASE_URL);
}
