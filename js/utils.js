// Funciones utilitarias compartidas por toda la web.

function formatPrice(value) {
  return "$" + Math.round(value).toLocaleString("es-AR");
}

function buildWhatsAppLink(number, message) {
  return "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
}
