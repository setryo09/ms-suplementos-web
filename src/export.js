// Exportación de pedidos a CSV (se abre con Excel).
// El registro oficial de pedidos es la base D1; este archivo solo arma las filas.

import { formatDateAR, formatOrderNumber } from "./util.js";

export const EXPORT_HEADERS = [
  "Número de pedido",
  "Fecha y hora",
  "Nombre del cliente",
  "Contacto",
  "Productos",
  "Cantidades",
  "Subtotal",
  "Código de creador",
  "Descuento",
  "Total final",
  "Estado del pago",
  "Estado del pedido",
  "Envío",
  "Costo de envío",
];

// Evita que un texto del cliente que empiece con = + - @ se interprete como fórmula.
function safeText(value) {
  const s = String(value ?? "");
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

export function orderToRow(env, order) {
  const items = JSON.parse(order.items_json);
  const contact = [
    `WhatsApp/Tel: ${order.customer_phone}`,
    order.customer_email ? `Email: ${order.customer_email}` : null,
    `Zona: ${order.customer_zone}`,
    order.customer_notes ? `Nota: ${safeText(order.customer_notes)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    formatOrderNumber(env, order.id),
    formatDateAR(order.created_at),
    safeText(order.customer_name),
    contact,
    items.map((l) => l.name).join("\n"),
    items.map((l) => String(l.quantity)).join("\n"),
    order.subtotal,
    order.creator_code || "",
    order.discount,
    order.total,
    order.payment_status,
    order.order_status,
    order.shipping_status,
    order.shipping_cost ?? "",
  ];
}

export function ordersToCsv(env, orders) {
  const cell = (v) => {
    const s = String(v ?? "");
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [EXPORT_HEADERS, ...orders.map((o) => orderToRow(env, o))].map((r) => r.map(cell).join(";"));
  // BOM para que Excel reconozca acentos; ";" es el separador de Excel en es-AR.
  return "﻿" + lines.join("\r\n");
}
