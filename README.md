# MYS Suplementos — tienda online

Sitio de la tienda + servidor de pedidos. Todo corre en **Cloudflare Workers** (el plan gratuito alcanza para empezar):

- `public/` → la web que ven los clientes (HTML, CSS, JS, imágenes, catálogo).
- `src/` → el servidor: calcula precios, descuentos y envío, asigna el número de pedido, crea el pago de Mercado Pago, recibe los webhooks y exporta los pedidos a CSV. **Nunca se publica como archivo.**
- `migrations/` → estructura de la base de datos (Cloudflare D1, SQLite) y el código de creador LIODUARTE.
- `docs/` → guías paso a paso.
- `tests/` → tests automáticos (`npm test`).

## Cómo funciona un pedido

1. El cliente arma el carrito. Si carga un **código de creador** (hoy: `LIODUARTE`, en mayúsculas o minúsculas), el servidor lo valida y aplica 10% sobre el subtotal de productos.
2. Elige su zona. **CABA**: envío sin cargo. **GBA**: envío por moto con el precio de una **cotización de Uber en ese momento** (gratis desde $80.000, regla que ya tenía la web). Otra zona: a cotizar.
3. En "Confirmá tu pedido" ve el detalle y el **total calculado por el servidor**.
4. Al confirmar, el servidor vuelve a validar productos, stock, cantidades, precios, código y envío (no usa ningún precio enviado por el navegador) y guarda el pedido en **D1**, el registro oficial, con un **número consecutivo** (`MYS-00001`, `MYS-00002`, …).
5. Según el caso:
   - **Pagar con tarjeta (Ualá Bis)** (si el envío ya está definido): se cobra el total del servidor. El pedido pasa a "Pagado" **solo** cuando llega el aviso de Ualá y el servidor confirma el pago consultando la API de Ualá. (Mercado Pago también está implementado, desactivado.)
   - **Coordinar por WhatsApp** (obligatorio si el envío está a cotizar): el pedido queda registrado y el cliente envía el resumen al WhatsApp del negocio (+54 9 11 2561-3113). Ustedes cotizan el envío en Uber, le confirman el costo y recién ahí cobran.
6. Todos los pedidos se descargan en un **CSV** que se abre con Excel ([guía 2](docs/02-EXPORTAR-PEDIDOS.md)).

Protecciones incluidas:

| Riesgo | Cómo se evita |
|---|---|
| Dos compras al mismo tiempo reciben el mismo número | El número sale de `AUTOINCREMENT` de SQLite (D1 serializa las escrituras). |
| Cliente hace doble clic o reintenta tras un corte | Clave de idempotencia por intento de compra: el mismo envío devuelve el mismo pedido. |
| Mercado Pago reenvía la misma notificación | Tabla `payment_events`: cada (pago, estado) se procesa una sola vez. |
| Alguien modifica precios en el navegador | El servidor ignora precios del navegador y usa `public/data/products.js`. |
| Cobrar un envío a GBA sin cotizar | El servidor rechaza el pago online cuando el envío está pendiente de cotización. |
| El precio o el código cambian mientras el cliente compra | El servidor compara con el total que vio el cliente y, si cambió, le muestra el nuevo antes de cobrar. |
| El cliente vuelve de Mercado Pago a "éxito" sin pagar | La página de retorno no decide nada: solo muestra el estado que dejó el webhook. |
| Pago por un monto distinto al pedido | Queda como "Revisar: monto no coincide", no como pagado. |
| Fórmulas maliciosas en el nombre del cliente | Se neutralizan en el CSV. |
| Exponer credenciales | Viven solo como secretos del servidor. `.gitignore` excluye `.dev.vars`. |

## Guías

1. [Puesta en marcha (Cloudflare, base de datos, publicación)](docs/01-PUESTA-EN-MARCHA.md)
2. [Exportar pedidos a CSV / Excel](docs/02-EXPORTAR-PEDIDOS.md)
3. [Mercado Pago Checkout Pro y modo de prueba](docs/03-MERCADO-PAGO.md)
4. [Códigos de creador](docs/04-CODIGOS-DE-CREADOR.md)
5. [Cómo probar pedidos y descuentos sin comprar](docs/05-PRUEBAS.md)
6. [Saludo instantáneo de Instagram](docs/06-INSTAGRAM-SALUDO.md)
7. [Ideas de marketing y borradores semanales automáticos](docs/07-MARKETING.md)
8. [GitHub](docs/08-GITHUB.md)
9. [Envío a GBA por moto y Uber Direct](docs/09-ENVIOS-UBER.md)
10. [Cobrar con tarjeta usando Ualá Bis](docs/10-UALA.md)

## Datos que faltan completar (no se inventaron)

| Dato | Dónde |
|---|---|
| Fotos de producto más livianas (las actuales pesan ~1,6–2,3 MB cada una y tardan en celulares con datos móviles) | `public/images/` |
| Páginas legales (términos, privacidad, cambios y devoluciones) | Footer de `public/index.html` |
| URL pública del sitio | `wrangler.toml` → `PUBLIC_BASE_URL` |

## Decisiones que son tuyas

- **Envío gratis en GBA desde $80.000**: se mantuvo porque ya estaba en la web. Si a partir de ahora todo envío a GBA se cobra según Uber, poné `freeShippingThreshold: null` en `public/data/config.js`.
- **Envío gratis** se calcula sobre el subtotal de productos (antes del descuento del código), como estaba en la web.
- **Botón de arrepentimiento y política de privacidad**: para vender online en Argentina conviene revisar con un profesional los requisitos (por ejemplo, la Resolución 424/2020 y la Ley 25.326 de datos personales).

## Respaldo

La versión anterior del sitio quedó en `_respaldo-original/` (excluida de Git).
