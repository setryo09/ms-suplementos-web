import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyWebhookSignature } from "../src/mercadopago.js";
import { hmacSha256Hex, formatOrderNumber, parseOrderNumber } from "../src/util.js";
import { orderToRow, ordersToCsv, EXPORT_HEADERS } from "../src/export.js";

test("firma de webhook válida e inválida", async () => {
  const secret = "secreto-de-prueba";
  const ts = "1704908010";
  const manifest = `id:123456;request-id:req-1;ts:${ts};`;
  const v1 = await hmacSha256Hex(secret, manifest);
  const header = `ts=${ts},v1=${v1}`;
  assert.equal(await verifyWebhookSignature({ secret, signatureHeader: header, requestId: "req-1", dataId: "123456" }), true);
  assert.equal(await verifyWebhookSignature({ secret, signatureHeader: header, requestId: "req-2", dataId: "123456" }), false);
  assert.equal(await verifyWebhookSignature({ secret: "otro", signatureHeader: header, requestId: "req-1", dataId: "123456" }), false);
  assert.equal(await verifyWebhookSignature({ secret, signatureHeader: null, requestId: "req-1", dataId: "123456" }), false);
});

test("número de pedido consecutivo y reversible", () => {
  const env = { ORDER_PREFIX: "MYS" };
  assert.equal(formatOrderNumber(env, 7), "MYS-00007");
  assert.equal(parseOrderNumber(env, "MYS-00007"), 7);
  assert.equal(parseOrderNumber(env, "MS-00007"), null);
  const conOffset = { ORDER_PREFIX: "MYS", ORDER_NUMBER_OFFSET: "1000" };
  assert.equal(formatOrderNumber(conOffset, 1), "MYS-01001");
  assert.equal(parseOrderNumber(conOffset, "MYS-01001"), 1);
  assert.equal(parseOrderNumber(conOffset, "MYS-00999"), null);
});

test("fila de exportación completa y sin fórmulas inyectadas", () => {
  const row = orderToRow({ ORDER_PREFIX: "MYS" }, {
    id: 3,
    created_at: "2026-10-08T15:30:00.000Z",
    customer_name: "=HYPERLINK(\"x\")",
    customer_phone: "1123456789",
    customer_email: null,
    customer_zone: "CABA",
    customer_notes: null,
    items_json: JSON.stringify([{ name: "Creatina 300g", quantity: 2 }]),
    subtotal: 50000,
    creator_code: "PRUEBA",
    discount: 5000,
    total: 45000,
    payment_status: "Pendiente de pago",
    order_status: "Esperando pago",
    shipping_status: "A cotizar: moto (Uber) por WhatsApp",
    shipping_cost: null,
  });
  assert.equal(row.length, EXPORT_HEADERS.length);
  assert.equal(row[0], "MYS-00003");
  assert.equal(row[1], "08/10/2026 12:30");
  assert.ok(row[2].startsWith("'="));
  assert.equal(row[9], 45000);
  assert.equal(row[12], "A cotizar: moto (Uber) por WhatsApp");
  assert.equal(row[13], "");
  const csv = ordersToCsv({ ORDER_PREFIX: "MYS" }, []);
  assert.ok(csv.startsWith("﻿Número de pedido;"));
});
