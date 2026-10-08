import { test } from "node:test";
import assert from "node:assert/strict";
import { priceItems, buildQuote, ValidationError } from "../src/pricing.js";
import { PRODUCTS } from "../public/data/products.js";

const creatina = PRODUCTS.find((p) => p.id === "creatina-300g");

test("usa el precio del catálogo, no el del navegador", () => {
  const lines = priceItems([{ productId: "creatina-300g", variantId: "pote", quantity: 2, price: 1 }]);
  assert.equal(lines[0].unitPrice, creatina.price);
  assert.equal(lines[0].lineTotal, creatina.price * 2);
});

test("código activo: 10% sobre el subtotal", () => {
  const lines = priceItems([{ productId: "creatina-300g", variantId: "pote", quantity: 1 }]);
  const q = buildQuote(lines, { code: "PRUEBA", active: true });
  assert.equal(q.discount, Math.round(creatina.price * 0.1));
  assert.equal(q.total, q.subtotal - q.discount);
  assert.equal(q.creatorCode, "PRUEBA");
});

test("código inexistente o desactivado: sin descuento", () => {
  const lines = priceItems([{ productId: "creatina-300g", variantId: "pote", quantity: 1 }]);
  assert.equal(buildQuote(lines, null).discount, 0);
  const off = buildQuote(lines, { code: "VIEJO", active: false });
  assert.equal(off.discount, 0);
  assert.equal(off.creatorCode, null);
});

test("rechaza cantidades inválidas, productos inexistentes y sin stock", () => {
  assert.throws(() => priceItems([{ productId: "creatina-300g", variantId: "pote", quantity: 0 }]), ValidationError);
  assert.throws(() => priceItems([{ productId: "creatina-300g", variantId: "pote", quantity: 1.5 }]), ValidationError);
  assert.throws(() => priceItems([{ productId: "creatina-300g", variantId: "pote", quantity: 99 }]), ValidationError);
  assert.throws(() => priceItems([{ productId: "no-existe", quantity: 1 }]), ValidationError);
  assert.throws(() => priceItems([]), ValidationError);
  const sinStock = PRODUCTS.flatMap((p) => (p.hasVariants ? p.variants.filter((v) => !v.inStock).map((v) => [p.id, v.id]) : []));
  for (const [productId, variantId] of sinStock) {
    assert.throws(() => priceItems([{ productId, variantId, quantity: 1 }]), ValidationError);
  }
});

test("agrupa líneas repetidas", () => {
  const lines = priceItems([
    { productId: "creatina-300g", variantId: "pote", quantity: 1 },
    { productId: "creatina-300g", variantId: "pote", quantity: 2 },
  ]);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].quantity, 3);
});

test("producto con variantes exige una variante válida", () => {
  assert.throws(() => priceItems([{ productId: "creatina-300g", quantity: 1 }]), ValidationError);
  assert.throws(() => priceItems([{ productId: "creatina-300g", variantId: "inventada", quantity: 1 }]), ValidationError);
  const lines = priceItems([{ productId: "creatina-300g", variantId: "paquete", quantity: 1 }]);
  assert.ok(lines[0].name.includes("(Paquete)"));
});
