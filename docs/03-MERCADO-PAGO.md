# 3. Mercado Pago Checkout Pro

Importante: si el envío está pendiente de cotización (GBA por moto debajo del envío gratis, u otra zona), el sitio no ofrece Mercado Pago y el servidor lo rechaza; ese pedido se coordina por WhatsApp. Ver [09-ENVIOS-UBER](09-ENVIOS-UBER.md).

> El negocio cobra con **Ualá Bis** ([guía 10](10-UALA.md)). Mercado Pago queda implementado pero desactivado: solo se activa si cargás sus credenciales.

Ya está implementado en el servidor (`src/mercadopago.js` y el webhook en `src/worker.js`). Falta que crees la aplicación y cargues las credenciales. Mientras no estén cargadas, la opción "Mercado Pago" no aparece y la tienda sigue funcionando con "Coordinar por WhatsApp".

Reglas de seguridad que ya cumple el código:

- El **Access Token** solo existe como secreto del servidor (`MP_ACCESS_TOKEN`). Nunca está en HTML ni JavaScript del navegador.
- El monto cobrado es el total calculado por el servidor.
- El pedido pasa a "Pagado" **solo por webhook**: el servidor recibe el aviso, valida la firma, y además consulta el pago a la API de Mercado Pago. Volver a la página de éxito no marca nada.
- Notificaciones repetidas se procesan una sola vez.
- Si el monto pagado no coincide con el total del pedido, queda "Revisar: monto no coincide".

## 3.1 Crear la aplicación

1. Entrá a https://www.mercadopago.com.ar/developers con la cuenta de Mercado Pago del negocio.
2. **Tus integraciones** → **Crear aplicación**.
3. Nombre: `MYS Suplementos web`. Tipo de solución: **Pagos online** → **Checkout Pro**. Aceptá y creá.

## 3.2 Probar primero en modo de prueba (sin dinero real)

1. En tu aplicación → **Cuentas de prueba** → creá dos: una **Vendedor** y una **Comprador** (país Argentina). Guardá usuario y contraseña que te asigna Mercado Pago.
2. En tu aplicación → **Credenciales de prueba** → copiá el **Access Token** (empieza con `TEST-`).
3. Cargalo en Cloudflare:

```bash
npx wrangler secret put MP_ACCESS_TOKEN
```

4. Configurá el webhook: en tu aplicación → **Webhooks** → **Configurar notificaciones**:
   - **URL modo prueba**: `https://TU-SITIO/api/webhooks/mercadopago`
   - **Eventos**: marcá **Pagos**.
   - Guardá. Clic en **Revelar** la **clave secreta** y cargala:

```bash
npx wrangler secret put MP_WEBHOOK_SECRET
```

5. Asegurate de que `PUBLIC_BASE_URL` en `wrangler.toml` sea la URL pública (la de `workers.dev` sirve) y publicá: `npm run deploy`.
6. Hacé una compra de prueba siguiendo [05-PRUEBAS](05-PRUEBAS.md): abrí la tienda en una **ventana de incógnito**, pagá iniciando sesión con el **comprador de prueba** y usá las **tarjetas de prueba** publicadas por Mercado Pago:
   https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/integration-test/test-purchases
   El nombre del titular define el resultado: `APRO` aprobado, `OTHE` rechazado, `CONT` pendiente (DNI de prueba `12345678`).
7. En el panel → **Webhooks** → podés ver las notificaciones enviadas y simular una.

## 3.3 Pasar a cobros reales

Solo cuando las pruebas den bien:

1. En tu aplicación → **Credenciales de producción** → activalas (Mercado Pago puede pedir datos del negocio).
2. Reemplazá el token por el de producción (empieza con `APP_USR-`):

```bash
npx wrangler secret put MP_ACCESS_TOKEN
```

3. En **Webhooks**, completá también la **URL modo producción** con la misma dirección y verificá que la clave secreta cargada sea la correcta.
4. Hacé una compra real de bajo monto y reembolsala desde Mercado Pago para confirmar todo el circuito (en el CSV debe figurar "Pagado" y luego "Reembolsado").

## 3.4 Qué ve el cliente

1. Confirma el pedido → recibe número (ej. `MYS-00012`) → va al Checkout Pro de Mercado Pago.
2. Al terminar vuelve a `pedido.html`, que consulta el estado al servidor cada pocos segundos.
3. Si el pago fue rechazado, puede reintentar con el mismo pedido (mismo número).

## 3.5 Problemas comunes

| Síntoma | Revisar |
|---|---|
| No aparece la opción Mercado Pago | Falta `MP_ACCESS_TOKEN` o `PUBLIC_BASE_URL`. |
| El cliente pagó pero sigue "Pendiente de pago" | URL del webhook mal escrita, `PUBLIC_BASE_URL` incorrecta, o firma: revisá que `MP_WEBHOOK_SECRET` sea la clave de **esta** aplicación. Mirá los logs: Cloudflare → Workers → `ms-suplementos` → Logs. |
| "Revisar: monto no coincide" | El monto pagado difiere del total del pedido. Verificalo en Mercado Pago antes de entregar. |
