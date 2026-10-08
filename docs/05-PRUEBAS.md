# 5. Cómo revisar el flujo de pedido y descuento sin hacer una compra real

Tres niveles, de menor a mayor esfuerzo. Ninguno mueve dinero real.

## Nivel 1 — Tests automáticos (2 minutos)

```bash
npm test
```

Comprueban: precios del catálogo (ignora precios del navegador), 10% de descuento, códigos inválidos/desactivados, cantidades y stock, firma de webhooks, numeración, reglas de envío y la exportación CSV.

## Nivel 2 — En tu PC, sin Mercado Pago (10 minutos)

```bash
copy .dev.vars.example .dev.vars
npm run db:migrate:local
npx wrangler d1 execute mys-pedidos --local --command "INSERT INTO creator_codes (code, creator_name) VALUES ('APAGADO', 'Prueba local')"
npx wrangler d1 execute mys-pedidos --local --command "UPDATE creator_codes SET active = 0 WHERE code = 'APAGADO'"
npm run dev
```

(`LIODUARTE` ya lo carga la migración. `APAGADO` es solo de tu base local.)

Abrí http://localhost:8787 y probá:

- [ ] Agregar productos, cambiar cantidades, quitar.
- [ ] Código `lioduarte` o `LIODUARTE` → muestra "Código aplicado" y −10% del subtotal.
- [ ] Código `APAGADO` y uno inventado → "El código no existe o no está activo", sin descuento.
- [ ] "Continuar" → el resumen muestra el total calculado por el servidor.
- [ ] Confirmar con "Coordinar por WhatsApp" → aparece el número `MYS-00001`; el siguiente pedido es `MYS-00002`.
- [ ] Doble clic rápido en "Confirmar" → se crea un solo pedido.
- [ ] Desde la consola del navegador no se puede cambiar el precio: probá
  `fetch('/api/quote',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items:[{productId:'creatina-300g',quantity:1,price:1}]})}).then(r=>r.json()).then(console.log)` → el total sigue siendo $25.000.

Ver lo que quedó guardado:

```bash
npx wrangler d1 execute mys-pedidos --local --command "SELECT id, customer_name, subtotal, creator_code, discount, total, payment_status FROM orders"
```

## Nivel 3 — Publicado, con Mercado Pago en modo de prueba (30 minutos)

1. Publicá en la URL `workers.dev` ([guía 1](01-PUESTA-EN-MARCHA.md)) con **credenciales de prueba** de Mercado Pago ([guía 3](03-MERCADO-PAGO.md)).
2. Usá el código `LIODUARTE` (o cargá uno de prueba y después lo desactivás).
3. En una **ventana de incógnito**: armá un pedido con el código, elegí zona **CABA** (en GBA debajo de $80.000 no se ofrece Mercado Pago porque el envío se cotiza), elegí Mercado Pago, pagá con el **comprador de prueba** y una **tarjeta de prueba** con titular `APRO`.
4. Verificá:
   - [ ] Al volver, `pedido.html` pasa de "Pendiente de pago" a "Pagado" en unos segundos (eso lo hace el webhook, no el regreso).
   - [ ] En el CSV ([guía 2](02-EXPORTAR-PEDIDOS.md)): número, código, descuento, total, "Pagado" y "Para preparar".
   - [ ] Con zona GBA y subtotal menor a $80.000 solo aparece "Coordinar por WhatsApp" y el pedido queda con envío "A cotizar".
5. Repetí con titular `OTHE` → "Rechazado" y botón "Reintentar pago".
6. Abrí el link de Mercado Pago y cerralo sin pagar → el pedido queda "Pendiente de pago".
7. En Mercado Pago Developers → Webhooks → **Simular** una notificación repetida → no se duplica nada.

### Antes de lanzar: empezar con una base limpia

Los pedidos de prueba consumen números. Para que el primer pedido real sea `MYS-00001`, sin borrar nada:

1. Creá una base nueva: `npx wrangler d1 create mys-pedidos-produccion`, poné su `database_id` y `database_name` en `wrangler.toml` (también en los scripts `db:migrate:*` de `package.json`) y aplicá las migraciones con `npm run db:migrate:remote`.
2. Las migraciones vuelven a cargar `LIODUARTE`; agregá otros códigos si hace falta.
3. Cambiá las credenciales de Mercado Pago a producción y publicá.

La base de prueba queda como estaba; borrala cuando quieras desde el panel.
