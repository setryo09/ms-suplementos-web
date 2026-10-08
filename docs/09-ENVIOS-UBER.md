# 9. Envío a GBA por moto (cotización de Uber)

## Regla actual

| Zona | Envío | ¿Se puede pagar online? |
|---|---|---|
| CABA | Sin cargo | Sí |
| GBA, subtotal desde $80.000 | Gratis (regla que ya tenía la web) | Sí |
| GBA, subtotal menor | Moto. **El costo es el de una cotización de Uber en ese momento**; no hay tarifa fija. | **No**: el pedido se registra y se coordina por WhatsApp. Ustedes cotizan en Uber, le confirman el costo al cliente y recién ahí cobran. |
| Otra | A cotizar por WhatsApp | No |

- El servidor aplica la regla (`src/shipping.js`) y rechaza el pago con Mercado Pago cuando el envío está pendiente de cotización, aunque alguien manipule la web.
- En la base y en el CSV quedan las columnas **Envío** ("A cotizar: moto (Uber) por WhatsApp") y **Costo de envío** (vacío = pendiente).
- Para quitar el envío gratis en GBA: en `public/data/config.js` poné `freeShippingThreshold: null`. Desde ahí todo envío a GBA queda a cotizar.

## Flujo manual (hoy)

1. Entra el pedido con número `MYS-000xx` y "A cotizar".
2. Abren la app de Uber → **Envíos** (Uber Envíos / Flash en Buenos Aires) → cargan origen y la dirección del cliente → ven el precio de la moto en ese momento.
3. Le escriben al cliente por WhatsApp con el número de pedido, el costo del envío y el total.
4. Cobran (transferencia, efectivo o un link de pago que generen ustedes) y piden el envío en Uber.

## ¿Se puede automatizar con Uber Direct?

Uber Direct es el servicio de Uber para que comercios pidan y **coticen** envíos por API (`Create Quote`). Lo que pude averiguar:

- Uber dice que Uber Direct está disponible en "unas dos docenas de países", sin publicar la lista: https://merchants.ubereats.com/us/en/services/uber-direct/
- La documentación para desarrolladores indica que la creación de cuentas está disponible solo en algunas regiones y que hay que confirmarlo con un representante de Uber: https://developer.uber.com/docs/deliveries/get-started
- **No encontré confirmación de que Uber Direct (con API) funcione en Argentina.** En Buenos Aires sí opera el servicio de envíos de la app para personas, que no tiene API para comercios: https://www.uber.com/ar/es/b/courier-services/capital-federal-ciudad-autonomade-buenos-aires-ar
- No tengo acceso a su cuenta de Uber para verificarlo.

Por eso **no se integró**: el envío queda pendiente de cotización manual, como pidieron.

### Cómo averiguarlo para su cuenta y zona

1. Entren a la página de Uber Direct (https://merchants.ubereats.com, sección Uber Direct) con la cuenta de Uber del negocio y vean si permite registrarse desde Argentina.
2. Si no aparece la opción, escriban al equipo comercial de Uber (formulario de contacto de esa página) preguntando:
   - ¿Uber Direct está disponible para comercios en CABA y GBA?
   - ¿Habilitan la API de cotización (Create Quote) para nuestra cuenta?
   - ¿Qué vehículos (moto) y qué medios de facturación admiten?
3. Si se los habilitan, van a recibir `customer_id`, `client_id` y `client_secret`. Con eso se puede agregar en el servidor una cotización automática (llamada a `Create Quote` con la dirección del cliente) y sumar el costo al total antes de cobrar. Esas credenciales irían como secretos de Cloudflare, nunca en el código.
