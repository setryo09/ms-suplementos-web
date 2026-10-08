# 2. Exportar pedidos (CSV para Excel)

El **registro oficial de pedidos es la base D1** de Cloudflare. No se conecta el Google Sheets anterior ni hay integración automática con Excel por ahora.

Para ver los pedidos en Excel, descargá el CSV. Necesitás haber cargado `ADMIN_TOKEN` ([guía 1](01-PUESTA-EN-MARCHA.md)). Desde una terminal (en PowerShell escribí `curl.exe`):

```bash
curl.exe -H "Authorization: Bearer TU_ADMIN_TOKEN" -o pedidos.csv https://TU-SITIO/api/admin/orders.csv
```

Abrí `pedidos.csv` con Excel (doble clic). Columnas:

`Número de pedido` · `Fecha y hora` · `Nombre del cliente` · `Contacto` · `Productos` · `Cantidades` · `Subtotal` · `Código de creador` · `Descuento` · `Total final` · `Estado del pago` · `Estado del pedido` · `Envío` · `Costo de envío`

- "Total final" es el total de productos con descuento. Si "Envío" dice "A cotizar…", el costo de envío se agrega al coordinar por WhatsApp ("Costo de envío" vacío = pendiente).
- El archivo tiene datos personales de clientes: no lo compartas ni lo subas a GitHub. El `.gitignore` excluye `.csv` y `.xlsx`, pero conviene guardarlo fuera de la carpeta del proyecto.

También podés consultar la base directamente: Cloudflare → **Storage & Databases** → **D1** → `mys-pedidos` → **Console**:

```sql
SELECT id, created_at, customer_name, total, payment_status, shipping_status FROM orders ORDER BY id DESC LIMIT 50;
```

## Si más adelante querés Excel en OneDrive automático

Se puede volver a agregar con Microsoft Graph, pero la API de Excel **solo funciona con OneDrive para empresas / SharePoint** (Microsoft 365 empresarial), no con OneDrive personal: https://learn.microsoft.com/graph/api/resources/excel
