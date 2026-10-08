// Página de regreso desde Mercado Pago.
// No decide si el pedido está pagado: solo muestra lo que informa el
// servidor, que se actualiza únicamente con los webhooks de Mercado Pago.
// Los parámetros que Mercado Pago agrega a la URL (status, collection_status…)
// se ignoran a propósito.

import { CONFIG } from "../data/config.js";
import { api, buildWhatsAppLink, isWhatsAppConfigured, formatPrice, storage } from "./utils.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const last = storage.get("ms_last_order", {});
const orderNumber = params.get("n") || last.n || "";
const token = params.get("t") || last.t || "";

const POLL_MS = 4000;
const MAX_POLLS = 30; // ~2 minutos
let polls = 0;

function render(data) {
  $("order-number").textContent = data.orderNumber;
  const pill = $("status-pill");
  pill.textContent = data.paymentStatus;
  pill.className = "status-pill" + (data.paid ? " status-pill--ok" : /Rechazado|Cancelado/.test(data.paymentStatus) ? " status-pill--bad" : "");

  if (data.paid) {
    $("status-text").textContent = `¡Pago confirmado por Mercado Pago! Total ${formatPrice(data.total)}. Te escribimos para coordinar la entrega.`;
  } else if (data.retryUrl && /Rechazado|Cancelado/.test(data.paymentStatus)) {
    $("status-text").textContent = "El pago no se completó. Podés intentarlo de nuevo con otro medio.";
  } else {
    $("status-text").textContent = "Todavía no recibimos la confirmación de Mercado Pago. Esta página se actualiza sola.";
  }

  const retry = $("retry-btn");
  retry.hidden = !data.retryUrl || data.paid;
  if (data.retryUrl) {
    retry.href = data.retryUrl;
    retry.textContent = /Rechazado|Cancelado/.test(data.paymentStatus) ? "Reintentar pago" : "Ir a pagar";
  }

  if (isWhatsAppConfigured(CONFIG.whatsappNumber)) {
    const wa = $("wa-btn");
    wa.hidden = false;
    wa.href = buildWhatsAppLink(CONFIG.whatsappNumber, `Hola MYS, consulto por mi pedido ${data.orderNumber}.`);
  }
  return data.paid || /Rechazado|Cancelado|Reembolsado|Contracargo|Revisar/.test(data.paymentStatus);
}

async function poll() {
  polls++;
  let res = null;
  try {
    res = await api(`/api/orders/status?n=${encodeURIComponent(orderNumber)}&t=${encodeURIComponent(token)}`);
  } catch {
    res = null;
  }
  if (res && res.ok) {
    const final = render(res.data);
    if (final) return;
  } else if (res && res.status === 404) {
    $("status-text").textContent = "No encontramos este pedido. Si pagaste, escribinos con tu número de pedido.";
    $("status-pill").textContent = "Sin datos";
    return;
  }
  if (polls < MAX_POLLS) setTimeout(poll, POLL_MS);
  else $("status-text").textContent += " Si ya pagaste, la confirmación puede demorar unos minutos: recargá la página más tarde.";
}

document.addEventListener("DOMContentLoaded", () => {
  if (!orderNumber || !token) {
    $("status-text").textContent = "No encontramos los datos del pedido en este enlace.";
    $("status-pill").textContent = "Sin datos";
    return;
  }
  $("order-number").textContent = orderNumber;
  poll();
});
