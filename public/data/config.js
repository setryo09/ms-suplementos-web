// Configuración PÚBLICA del negocio (la ve cualquiera que abra la web).
// Nunca pongas acá tokens, claves ni contraseñas: esos van como variables
// de entorno del servidor (ver .dev.vars.example y docs/).
// El servidor también lee este archivo (reglas de envío).

export const CONFIG = {
  businessName: "MYS Suplementos",

  // Número para los enlaces wa.me: 549 + código de área + número, sin espacios ni signos.
  whatsappNumber: "5491125613113",
  // Cómo se muestra el número en la web.
  whatsappDisplay: "+54 9 11 2561-3113",

  // Instagram del negocio.
  instagramHandle: "@mys.suplementos",

  // Email de contacto (si queda vacío, no se muestra).
  email: "Mssuplementos.ok@gmail.com",

  // Horario de atención (si queda vacío, no se muestra).
  hours: "9:00 a 18:00",

  shipping: {
    // CABA: entrega sin cargo.
    // GBA: envío por moto. El costo es el de una cotización de Uber en el
    // momento del pedido (no hay tarifa fija) y se confirma por WhatsApp
    // antes de cobrarlo. Ver docs/09-ENVIOS-UBER.md.
    // Envío gratis en GBA desde este subtotal (regla que ya tenía la web).
    // Para quitar el envío gratis, poné null.
    freeShippingThreshold: 80000,
  },

  whatsappDefaultMessage: "Hola MYS, quería consultar por los suplementos.",
};
