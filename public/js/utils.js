// Funciones utilitarias compartidas por toda la web.

export function formatPrice(value) {
  return "$" + Math.round(value).toLocaleString("es-AR");
}

export function isWhatsAppConfigured(number) {
  return /^\d{10,15}$/.test(String(number || ""));
}

export function buildWhatsAppLink(number, message) {
  return "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Llamada a la API del sitio. Devuelve { ok, status, data } y nunca lanza
// por errores HTTP (sí por falta de conexión, que se maneja aparte).
export async function api(path, body) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok && data && data.ok, status: res.status, data };
}

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* modo privado o almacenamiento bloqueado: seguimos sin persistir */
    }
  },
  remove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* idem */
    }
  },
};

export function newIdempotencyKey() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
