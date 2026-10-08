# 10. Cobrar con tarjeta usando Ualá Bis

La tienda usa la **API Cobros Online v2 de Ualá Bis** (https://developers.ualabis.com.ar/v2). El cliente paga con tarjeta de crédito, débito o prepaga en la página segura de Ualá y vuelve a la tienda.

Cómo funciona:

- El servidor crea la orden en Ualá por el **total calculado por el servidor** (`src/uala.js`).
- El pedido pasa a "Pagado" **solo** cuando llega el aviso de Ualá y el servidor **consulta la orden a la API de Ualá** con sus credenciales. Ualá no firma sus avisos, por eso nunca se confía en el contenido del aviso.
- Avisos repetidos se procesan una sola vez. Si el monto pagado no coincide, queda "Revisar: monto no coincide".
- Si el envío está pendiente de cotización (GBA por moto debajo del envío gratis, u otra zona), **no se ofrece pago online**: se coordina por WhatsApp.
- Mientras no estén cargadas las credenciales, la opción "Pagar con tarjeta" no aparece.

## 1. Conseguir las credenciales (en tu cuenta de Ualá)

En la app de Ualá o en la web de Ualá Bis: **Ualá Bis → Cobros online → API**. Ahí están tus datos `username`, `client_id` y `client_secret_id`, separados en **prueba** y **producción**. No los compartas por chat ni los subas a GitHub.

## 2. Cargarlas en Cloudflare (sin terminal)

1. https://dash.cloudflare.com → **Workers & Pages** → `mys-suplementos` → **Settings** → **Variables and Secrets** → **Add**.
2. Agregá tres, con **Type: Secret** (empezá con las de **prueba**):

| Nombre (exacto) | Valor |
|---|---|
| `UALA_USERNAME` | tu `username` |
| `UALA_CLIENT_ID` | tu `client_id` |
| `UALA_CLIENT_SECRET` | tu `client_secret_id` |

3. **Deploy** / guardar. En unos segundos la opción "Pagar con tarjeta" aparece en el checkout.

`UALA_ENV` (en `wrangler.toml`) define el ambiente: `"stage"` = pruebas con pagos simulados, `"production"` = cobros reales. Las credenciales de prueba solo funcionan con `"stage"` y las de producción con `"production"`.

## 3. Probar sin dinero real

1. Con credenciales de **prueba** y `UALA_ENV = "stage"`, hacé un pedido en la tienda con zona **CABA** y elegí **Pagar con tarjeta**.
2. **Comprobá el monto en la página de Ualá**: tiene que coincidir con el total de la tienda. La documentación de Ualá pide el monto en centavos, pero algunos ejemplos suyos usan otro formato. Si en la página de Ualá ves un monto 100 veces más grande o más chico, cambiá `UALA_AMOUNT_FORMAT` en `wrangler.toml` a `"pesos"` y volvé a publicar.
3. Pagá con la tarjeta de prueba que figura en el panel de Ualá Bis: **Credenciales de prueba → Ver datos de tarjeta de prueba**.
4. Al volver, la página del pedido tiene que pasar a **Pagado** en unos segundos.

## 4. Pasar a cobros reales

1. En Cloudflare, reemplazá los 3 secretos por las credenciales de **producción**.
2. Cambiá `UALA_ENV = "production"` en `wrangler.toml` y publicá.
3. Hacé una compra real chica para confirmar todo el circuito.

Consultas técnicas a Ualá: developers.ualabis@uala.com.ar
