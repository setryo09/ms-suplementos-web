# 1. Puesta en marcha

Qué necesitás y todavía no está configurado:

- [ ] **Node.js 20 o superior** en tu PC (hoy no está instalado).
- [ ] **Cuenta de Cloudflare** (gratuita) — aloja el sitio, el servidor y la base de datos.
- [ ] Opcional: tu dominio apuntando a Cloudflare.

> Por qué Cloudflare y no solo GitHub Pages: GitHub Pages sirve solo archivos estáticos y no puede guardar pedidos, asignar números ni recibir webhooks. Cloudflare Workers sirve la misma web estática **y** ejecuta el servidor en el mismo dominio.

## 1.1 Instalar Node.js

1. Descargá la versión **LTS** desde https://nodejs.org e instalala con las opciones por defecto.
2. Abrí una terminal nueva en la carpeta del proyecto y verificá:

```bash
node --version
```

3. Instalá las dependencias del proyecto (solo Wrangler, la herramienta de Cloudflare):

```bash
npm install
```

4. Corré los tests:

```bash
npm test
```

## 1.2 Conectar Wrangler con tu cuenta de Cloudflare

Creá la cuenta en https://dash.cloudflare.com/sign-up y después:

```bash
npx wrangler login
```

Se abre el navegador para que autorices. Wrangler nunca te pide la contraseña en la terminal.

## 1.3 Crear la base de datos

```bash
npx wrangler d1 create mys-pedidos
```

Copiá el `database_id` que muestra y pegalo en `wrangler.toml` en lugar de `COMPLETAR-DATABASE-ID` (no es secreto). Luego creá las tablas:

```bash
npm run db:migrate:remote
```

Opcional: si querés que la numeración empiece en otro número (por ejemplo, que el primer pedido sea `MYS-01001`), **antes del primer pedido** cambiá en `wrangler.toml` `ORDER_NUMBER_OFFSET = "1000"`. No lo cambies después de haber recibido pedidos.

## 1.4 Publicar por primera vez

```bash
npm run deploy
```

Wrangler muestra la dirección, por ejemplo `https://mys-suplementos.TU-SUBDOMINIO.workers.dev`. Abrila: la tienda ya funciona con pedidos "Coordinar por WhatsApp".

Copiá esa URL (o tu dominio, si ya lo conectaste) en `wrangler.toml` → `PUBLIC_BASE_URL` (sin barra final) y volvé a publicar con `npm run deploy`. Mercado Pago necesita esa URL para los webhooks y el regreso del cliente.

## 1.5 Cargar los secretos

Cada uno se carga así (te pide el valor de forma oculta; no queda en ningún archivo):

```bash
npx wrangler secret put ADMIN_TOKEN
```

| Secreto | Para qué | Guía |
|---|---|---|
| `ADMIN_TOKEN` | Clave larga y aleatoria para descargar el CSV de pedidos. Generala con un gestor de contraseñas. | [02](02-EXPORTAR-PEDIDOS.md) |
| `MP_ACCESS_TOKEN` | Access Token de Mercado Pago | [03](03-MERCADO-PAGO.md) |
| `MP_WEBHOOK_SECRET` | Clave secreta de webhooks de Mercado Pago | [03](03-MERCADO-PAGO.md) |

También podés cargarlos desde el panel: Cloudflare → Workers & Pages → `mys-suplementos` → Settings → Variables and Secrets → Add → tipo **Secret**.

## 1.6 Conectar tu dominio (opcional)

Cloudflare → Workers & Pages → `mys-suplementos` → Settings → Domains & Routes → Add → Custom domain. Si hoy el sitio está en otro hosting (por ejemplo GitHub Pages), al conectar el dominio acá dejá de usar el anterior. Actualizá `PUBLIC_BASE_URL` y la URL del webhook de Mercado Pago.

## 1.7 Probar en tu PC (opcional)

```bash
copy .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Completá `.dev.vars` con credenciales **de prueba**. Abrí http://localhost:8787. Nota: Mercado Pago no puede enviar webhooks a tu PC; para probar pagos de punta a punta usá la URL `workers.dev` (ver [05-PRUEBAS](05-PRUEBAS.md)).

## 1.8 Publicación automática desde GitHub (opcional)

Cloudflare → Workers & Pages → `mys-suplementos` → Settings → Build → Connect (Git repository). Cada `git push` a la rama principal publica. Los secretos se quedan en Cloudflare, no en GitHub.
