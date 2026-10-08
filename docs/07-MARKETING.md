# 7. Ideas de marketing semanales

Todo lo de abajo usa **solo** información que ya está en el proyecto: productos y sus descripciones (`public/data/products.js`), precios cargados, la sección "Quiénes somos", envíos y preguntas frecuentes. No hay promociones ni afirmaciones inventadas.

Cuidados antes de publicar:

- Los precios y el "precio anterior" son los cargados hoy en el catálogo ($25.000 / antes $30.000 la creatina; $64.000 / antes $70.000 el Whey). Confirmalos antes de mostrarlos.
- El Whey sabor **Chocolate está sin stock** en el catálogo: no lo promociones hasta que vuelva.
- Evitá prometer resultados de salud o físicos. Para beneficios, citá textual la descripción del envase/catálogo y sumá la advertencia "Suplemento dietario. No reemplaza una alimentación variada y equilibrada. Consultá con un profesional de la salud". La publicidad de suplementos dietarios en Argentina está regulada (ANMAT): ante dudas, consultá.
- Los códigos de creador dan 10% sobre el subtotal; nombrá solo códigos que existan y estén activos.

## Rotación de 4 semanas

Cada semana: **2 publicaciones**, **1 reel**, **3 historias**.

### Semana 1 — Quiénes somos

| Formato | Idea | Fuente |
|---|---|---|
| Publicación (carrusel) | "Somos MS": dos amigos que entrenan hace años, se cansaron de pagar de más por productos que no sabían si eran buenos, y empezaron a vender lo que usan. Cierre: "Sin vueltas." | Quiénes somos |
| Publicación | Los 4 valores: Calidad, Precio justo, Transparencia, Rendimiento (una placa por valor). | Quiénes somos |
| Reel | Ustedes dos armando un pedido y contando en 15 s por qué arrancaron. | Quiénes somos |
| Historias | 1) "¿Qué querés saber de nosotros?" (caja de preguntas). 2) Foto real del stock. 3) Link a la web. | — |

### Semana 2 — Creatina

| Formato | Idea | Fuente |
|---|---|---|
| Publicación | Ficha: Creatina Monohidrato Body Advance 300 g — 100% pura, micronizada, sin sabor, libre de gluten, industria argentina, rinde aprox. 100 servicios. | Catálogo |
| Publicación | "Cómo se toma": 1 medida (aprox. 5 g) en agua, jugo o tu bebida; recomendación del envase: después de entrenar o según indicación profesional. + advertencia. | Modo de uso |
| Reel | Se disuelve sin sabor: mezclar una medida en agua en cámara. | Catálogo ("sin sabor — se disuelve en agua, jugo o batido") |
| Historias | 1) Precio y precio anterior. 2) Encuesta "¿Ya tomás creatina?". 3) Botón al producto. | Catálogo |

### Semana 3 — Whey Protein

| Formato | Idea | Fuente |
|---|---|---|
| Publicación | Ficha: Whey Protein Advance Gold Line 908 g — con BCAA's, glutamina y creatina agregada; fácil disolución; industria argentina. | Catálogo |
| Publicación | "Cómo se toma": 1–2 medidas en agua, leche o tu bebida, después de entrenar o distribuido en el día. + advertencia. | Modo de uso |
| Reel | Preparación del batido sabor vainilla en 10 segundos. | Catálogo |
| Historias | 1) Vainilla disponible (avisar cuando vuelva chocolate, sin fecha). 2) Pregunta "¿Con agua o con leche?". 3) Link a la web. | Catálogo |

### Semana 4 — Cómo comprar y envíos

| Formato | Idea | Fuente |
|---|---|---|
| Publicación | Envíos: despacho en hasta 72 hs; CABA sin cargo; GBA por moto (costo según cotización de Uber al momento, confirmado por WhatsApp), gratis desde $80.000. | Envíos / FAQ |
| Publicación | "Cómo comprar en 3 pasos": armás el pedido, confirmás y recibís tu número, pagás y coordinamos por WhatsApp. | Sección "Cómo comprar" |
| Reel | Grabación de pantalla: compra en la web desde el celular hasta el número de pedido. | Web |
| Historias | 1) FAQ "¿Puedo comprar más de un producto?". 2) FAQ "¿Cómo funciona el envío gratis?". 3) "¿Tenés código de creador? Cargalo en el carrito: 10% off". | FAQ |

Después de la semana 4, repetí la rotación con fotos/videos nuevos y respuestas a preguntas reales que les lleguen por mensaje.

## Recibir borradores semanales automáticamente

**Nada de esto está funcionando ahora.** Claude no queda ejecutándose en segundo plano por haber recibido un pedido. Para tener borradores cada semana, algún servicio tiene que ejecutar una tarea programada. Opciones:

### Opción 1 — Tarea programada de Claude (la más simple si ya usás Claude)

- **Quién la ejecuta:** la función de tareas programadas de Claude (en Claude Code / Claude Desktop, "scheduled tasks" o rutinas en la nube), que corre en la infraestructura de Anthropic según el horario que definas.
- **Qué configurar:**
  1. Un plan de Claude que incluya tareas programadas.
  2. Un conector a la planilla destino (por ejemplo, Google Drive/Sheets o Microsoft 365) con permiso de escritura, autorizado por vos.
  3. Una tarea semanal (ej. lunes 9:00) con una instrucción como: "Leé `docs/07-MARKETING.md`, `public/data/products.js` y las preguntas frecuentes de `public/index.html`. Generá 2 publicaciones, 1 reel y 3 historias para la semana N de la rotación, sin inventar promociones ni afirmaciones de salud, y agregalas como filas nuevas (Fecha, Formato, Idea, Texto, Fuente, Estado = 'Borrador') en la planilla X."
- **Resultado:** filas en estado "Borrador" que ustedes revisan y publican a mano.

### Opción 2 — Power Automate (si tenés Microsoft 365 empresarial)

- **Quién la ejecuta:** Power Automate (Microsoft).
- **Qué configurar:** un flujo con disparador **Periodicidad** (semanal) → acción **HTTP** que llama a la API de Anthropic (requiere licencia Power Automate Premium para el conector HTTP y una clave de API de Anthropic guardada en el flujo, no en este proyecto) → acción **Excel Online (Business) – Agregar una fila a una tabla** en una tabla `Borradores` (Fecha, Formato, Idea, Texto, Fuente, Estado).

### Opción 3 — Make o Zapier

- **Quién la ejecuta:** Make.com o Zapier.
- **Qué configurar:** escenario programado semanal → módulo de Anthropic/Claude (clave de API propia) → módulo "Agregar fila" en Google Sheets, Excel o un tablero (Trello, Notion). Tiene costo según el plan.

En cualquier opción:

- Los borradores quedan para revisión humana. **No publiquen ni envíen mensajes automáticamente.**
- La clave de API se guarda en el servicio que ejecuta la automatización, nunca en este repositorio.
- Pasale al modelo solo información real (catálogo, FAQ, esta guía) e indicale que no invente promociones ni beneficios.
