// Textos de estado que se guardan en la base y salen en la exportación CSV.

export const PAYMENT = {
  WAITING: "Pendiente de pago",
  IN_PROCESS: "En proceso",
  PAID: "Pagado",
  REJECTED: "Rechazado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
  CHARGEBACK: "Contracargo",
  DISPUTE: "En disputa",
  TO_ARRANGE: "A coordinar por WhatsApp",
  REVIEW: "Revisar: monto no coincide",
};

export const ORDER = {
  WAITING_PAYMENT: "Esperando pago",
  TO_ARRANGE: "A coordinar",
  TO_PREPARE: "Para preparar",
  // Otros estados posibles que podés usar al gestionar el pedido:
  // "Preparando", "Enviado", "Entregado", "Cancelado".
};

// Estados de pago de Mercado Pago -> texto de la planilla.
export function paymentStatusFromMercadoPago(mpStatus) {
  switch (mpStatus) {
    case "approved":
      return PAYMENT.PAID;
    case "pending":
    case "in_process":
    case "authorized":
      return PAYMENT.IN_PROCESS;
    case "in_mediation":
      return PAYMENT.DISPUTE;
    case "rejected":
      return PAYMENT.REJECTED;
    case "cancelled":
      return PAYMENT.CANCELLED;
    case "refunded":
      return PAYMENT.REFUNDED;
    case "charged_back":
      return PAYMENT.CHARGEBACK;
    default:
      return PAYMENT.IN_PROCESS;
  }
}

// Estados de órdenes de Ualá Bis -> texto de la planilla.
// APPROVED: pagado y acreditado; PROCESSED: pagado, pendiente de acreditación.
export function paymentStatusFromUala(status) {
  switch (String(status || "").toUpperCase()) {
    case "APPROVED":
    case "PROCESSED":
    case "PROCCESED": // así aparece escrito en un ejemplo de la documentación de Ualá
      return PAYMENT.PAID;
    case "REJECTED":
      return PAYMENT.REJECTED;
    case "REFUNDED":
      return PAYMENT.REFUNDED;
    default:
      return PAYMENT.IN_PROCESS;
  }
}
