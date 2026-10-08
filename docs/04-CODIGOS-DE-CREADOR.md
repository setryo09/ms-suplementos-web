# 4. Códigos de creador

- Cada código **activo** aplica **10% de descuento sobre el subtotal de productos**.
- Se valida y se calcula **en el servidor**. El cliente ve el descuento y el total actualizado antes de confirmar.
- Si el código no existe o está desactivado, el cliente ve el aviso "El código no existe o no está activo" y no se aplica descuento.
- En cada pedido (y en el CSV) quedan guardados el **código usado** y el **monto descontado**.
- Los códigos ya no están en un archivo público del sitio (antes estaban en `data/discountCodes.js`, que estaba vacío): ahora viven en la base de datos, así nadie puede ver la lista desde el navegador.
- **Código activo: `LIODUARTE`** (acepta mayúsculas y minúsculas, 10%). Se carga automáticamente con la migración `migrations/0002_codigo_lioduarte.sql` al ejecutar `npm run db:migrate:remote`. Para agregar otros, usá los comandos de abajo.

Formato del código: letras, números, guion o guion bajo, de 2 a 40 caracteres. No distingue mayúsculas de minúsculas (`juan10` = `JUAN10`).

## Opción A: desde el panel de Cloudflare (sin terminal)

Cloudflare → **Storage & Databases** → **D1** → `mys-pedidos` → **Console**, y pegá el comando que necesites.

## Opción B: desde la terminal

Mismo SQL, con:

```bash
npx wrangler d1 execute mys-pedidos --remote --command "SELECT * FROM creator_codes"
```

## Comandos

Agregar un código (reemplazá `CODIGO` y `Nombre del creador`; la comisión es opcional y solo para tu control):

```sql
INSERT INTO creator_codes (code, creator_name, commission_percentage) VALUES ('CODIGO', 'Nombre del creador', NULL);
```

Desactivar un código (deja de aplicar descuento, pero se conserva el historial):

```sql
UPDATE creator_codes SET active = 0 WHERE code = 'CODIGO';
```

Reactivarlo:

```sql
UPDATE creator_codes SET active = 1 WHERE code = 'CODIGO';
```

Ver todos:

```sql
SELECT code, creator_name, active, commission_percentage FROM creator_codes ORDER BY code;
```

Ventas y descuentos por código (pedidos pagados o a coordinar):

```sql
SELECT creator_code, COUNT(*) AS pedidos, SUM(subtotal) AS subtotal, SUM(discount) AS descontado, SUM(total) AS total
FROM orders
WHERE creator_code IS NOT NULL AND payment_status IN ('Pagado', 'A coordinar por WhatsApp')
GROUP BY creator_code ORDER BY total DESC;
```

> Para probar en tu PC (`npm run dev`), usá los mismos comandos con `--local` en lugar de `--remote`. Ahí sí podés crear códigos de prueba inventados; en producción cargá solo los reales.

## Si querés cambiar el porcentaje

Está definido en un solo lugar del servidor: `CREATOR_DISCOUNT_PERCENT` en `src/pricing.js`. Si lo cambiás, actualizá también los textos "10%" de `public/index.html` y `public/js/main.js`.
