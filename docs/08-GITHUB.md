# 8. GitHub

Los cambios van en la rama **`mys-suplementos-actualizacion`** del repositorio existente (el que tiene la página vieja), con un Pull Request hacia `main` para revisión. No se integra a `main` ni se publica hasta que lo apruebes.

## Qué no se sube nunca

`.gitignore` excluye: `.dev.vars` (secretos locales), `node_modules/`, `.wrangler/`, `_respaldo-original/`, y exportaciones `*.csv` / `*.xlsx` con datos de clientes. Los secretos de Mercado Pago y `ADMIN_TOKEN` viven solo en Cloudflare.

Antes de cada commit, revisá:

```bash
git status
```

Si aparece `.dev.vars` o un `.csv`, no sigas.

## Revisar y aprobar el Pull Request

1. En GitHub → pestaña **Pull requests** → abrí el de `mys-suplementos-actualizacion`.
2. Pestaña **Files changed**: vas a ver que los archivos del sitio viejo en la raíz (`index.html`, `css/`, `js/`, `data/`, `images/`, `404.html`) aparecen como movidos/eliminados y que la web nueva está en `public/`. Eso es esperado.
3. Cuando estés conforme: **Merge pull request**. Recién ahí `main` tiene la versión nueva.

## Publicación

Hacer merge en GitHub no publica la tienda por sí solo. Para publicar: `npm run deploy` ([guía 1](01-PUESTA-EN-MARCHA.md)) o conectá el repositorio en Cloudflare (Workers → Settings → Build) para que cada push a `main` publique automáticamente.

Si hoy el sitio se publica con **GitHub Pages** desde `main`, al hacer merge la página vieja deja de estar en la raíz: GitHub Pages no puede ejecutar el servidor (pedidos, pagos, CSV). Antes de hacer merge, tené lista la publicación en Cloudflare y apuntá el dominio ahí; después desactivá GitHub Pages.
