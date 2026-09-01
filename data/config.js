// Configuración general del negocio.
// Todo lo que cambia seguido (WhatsApp, Instagram, envíos) vive acá,
// no repartido por el HTML o el JS.

const CONFIG = {
  businessName: "MS Suplementos",

  // TODO: reemplazar por el número real, formato 549 + código de área + número, sin espacios ni signos.
  whatsappNumber: "5491125613113",

  // TODO: confirmar usuario final de Instagram.
  instagramHandle: "@myssuplementos",

  // TODO: completar cuando esté creado.
  email: "Mssuplementos.ok@gmail.com",

  hours: "9:00 a 18:00",

  shipping: {
    freeShippingThreshold: 80000,
    cabaMessage: "Entrega en el día, sin cargo",
    gbaMessage: "Envío por moto",
  },

  whatsappDefaultMessage: "Hola MS, quería consultar por los suplementos.",

  // Registro de pedidos en Google Sheets (ver instrucciones aparte).
  // TODO: pegar acá la URL que te da Google al desplegar el Apps Script (termina en /exec).
  ordersWebhookUrl: "https://script.google.com/macros/s/AKfycbyOKeVMC7_h-shbutKJGjO2whdU80n72WU0sG-Px2tDMspJP2VFQ6qF6Ct-4mr6LVPZ/exec",
  // Este código tiene que ser IDÉNTICO al que pongas en el Apps Script (variable SECRET).
  // Ya generado, no hace falta que lo cambies, solo copiarlo en los dos lugares.
  ordersWebhookSecret: "YDUXVQx6an2ORL5VWXZYSln1",
};
