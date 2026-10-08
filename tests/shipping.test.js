import { test } from "node:test";
import assert from "node:assert/strict";
import { shippingFor, SHIPPING } from "../src/shipping.js";

const conUmbral = { shipping: { freeShippingThreshold: 80000 } };
const sinUmbral = { shipping: { freeShippingThreshold: null } };

test("CABA: sin cargo", () => {
  assert.deepEqual(shippingFor("CABA", 1000, conUmbral), { status: SHIPPING.CABA_FREE, cost: 0, pendingQuote: false });
});

test("GBA por debajo del umbral: a cotizar con Uber, sin tarifa fija", () => {
  const s = shippingFor("GBA", 79999, conUmbral);
  assert.equal(s.pendingQuote, true);
  assert.equal(s.cost, null);
  assert.equal(s.status, SHIPPING.GBA_QUOTE);
});

test("GBA desde el umbral: gratis", () => {
  assert.equal(shippingFor("GBA", 80000, conUmbral).status, SHIPPING.GBA_FREE);
});

test("sin umbral: GBA siempre a cotizar", () => {
  assert.equal(shippingFor("GBA", 999999, sinUmbral).pendingQuote, true);
});

test("otra zona: a cotizar", () => {
  assert.equal(shippingFor("Otra", 999999, conUmbral).pendingQuote, true);
});
