// Reglas de envío (servidor). Las tarifas NO están fijadas en el código:
// el envío por moto a GBA se cotiza con Uber en el momento y se confirma
// por WhatsApp antes de cobrarlo. Ver docs/09-ENVIOS-UBER.md.

import { CONFIG } from "../public/data/config.js";

export const SHIPPING = {
  CABA_FREE: "Sin cargo (CABA)",
  GBA_FREE: "Gratis (GBA)",
  GBA_QUOTE: "A cotizar: moto (Uber) por WhatsApp",
  OTHER_QUOTE: "A cotizar por WhatsApp",
};

// subtotal = subtotal de productos antes del descuento (misma regla que la web).
export function shippingFor(zone, subtotal, config = CONFIG) {
  const threshold = config.shipping.freeShippingThreshold;
  if (zone === "CABA") return { status: SHIPPING.CABA_FREE, cost: 0, pendingQuote: false };
  if (zone === "GBA") {
    if (Number.isFinite(threshold) && threshold > 0 && subtotal >= threshold) {
      return { status: SHIPPING.GBA_FREE, cost: 0, pendingQuote: false };
    }
    return { status: SHIPPING.GBA_QUOTE, cost: null, pendingQuote: true };
  }
  return { status: SHIPPING.OTHER_QUOTE, cost: null, pendingQuote: true };
}
