-- Pago online con Ualá Bis (API Cobros Online v2).
ALTER TABLE orders ADD COLUMN uala_order_id TEXT;      -- uuid de la orden en Ualá
ALTER TABLE orders ADD COLUMN uala_checkout_url TEXT;  -- link de pago (checkout_link)
ALTER TABLE orders ADD COLUMN uala_status TEXT;        -- último estado informado por la API de Ualá
CREATE INDEX idx_orders_uala_order_id ON orders (uala_order_id);
