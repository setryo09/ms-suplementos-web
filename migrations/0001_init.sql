-- Esquema inicial de la base de pedidos (Cloudflare D1 / SQLite).
-- Se aplica con: npx wrangler d1 migrations apply mys-pedidos --remote

-- Pedidos. El número de pedido visible (ej. MYS-00001) sale de `id`:
-- AUTOINCREMENT garantiza que nunca se repite ni se reutiliza, y SQLite
-- serializa las escrituras, así que dos compras simultáneas reciben
-- números distintos.
CREATE TABLE orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key  TEXT    NOT NULL UNIQUE,  -- evita duplicados si el cliente reintenta
  request_hash     TEXT    NOT NULL,
  public_token     TEXT    NOT NULL,         -- permite consultar el estado sin exponer otros pedidos
  created_at       TEXT    NOT NULL,         -- ISO 8601 UTC

  customer_name    TEXT    NOT NULL,
  customer_phone   TEXT    NOT NULL,
  customer_email   TEXT,
  customer_zone    TEXT    NOT NULL,
  customer_notes   TEXT,

  items_json       TEXT    NOT NULL,
  subtotal         INTEGER NOT NULL,
  creator_code     TEXT,
  discount         INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL,

  payment_method   TEXT    NOT NULL,         -- 'mercadopago' | 'whatsapp'
  payment_status   TEXT    NOT NULL,
  order_status     TEXT    NOT NULL,

  mp_preference_id TEXT,
  mp_init_point    TEXT,
  mp_payment_id    TEXT,
  mp_status        TEXT,

  shipping_status  TEXT    NOT NULL,         -- ej. "Sin cargo (CABA)", "A cotizar: moto (Uber) por WhatsApp"
  shipping_cost    INTEGER                   -- NULL = pendiente de cotización manual
);

-- Códigos de creador. Todo código activo aplica 10% sobre el subtotal.
-- Ver docs/04-CODIGOS-DE-CREADOR.md. El código LIODUARTE se carga en la migración 0002.
CREATE TABLE creator_codes (
  code                  TEXT    PRIMARY KEY COLLATE NOCASE,
  creator_name          TEXT    NOT NULL,
  active                INTEGER NOT NULL DEFAULT 1,
  commission_percentage REAL,             -- opcional, solo para tu control
  notes                 TEXT,
  created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Notificaciones de pago ya procesadas (evita procesar dos veces la misma).
CREATE TABLE payment_events (
  payment_id    TEXT NOT NULL,
  status        TEXT NOT NULL,
  status_detail TEXT NOT NULL DEFAULT '',
  order_id      INTEGER,
  received_at   TEXT NOT NULL,
  PRIMARY KEY (payment_id, status, status_detail)
);
