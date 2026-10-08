import { test } from "node:test";
import assert from "node:assert/strict";
import { toUalaAmount, fromUalaAmount } from "../src/uala.js";
import { paymentStatusFromUala, PAYMENT } from "../src/statuses.js";

test("monto en centavos (formato de la documentación)", () => {
  const env = { UALA_AMOUNT_FORMAT: "cents" };
  assert.equal(toUalaAmount(env, 39600), "3960000");
  assert.equal(fromUalaAmount(env, 3960000), 39600);
  assert.equal(toUalaAmount({}, 22000), "2200000"); // por defecto: centavos
});

test("monto en pesos (alternativa configurable)", () => {
  const env = { UALA_AMOUNT_FORMAT: "pesos" };
  assert.equal(toUalaAmount(env, 39600), "39600.00");
  assert.equal(fromUalaAmount(env, "39600.00"), 39600);
});

test("estados de Ualá", () => {
  assert.equal(paymentStatusFromUala("APPROVED"), PAYMENT.PAID);
  assert.equal(paymentStatusFromUala("PROCESSED"), PAYMENT.PAID);
  assert.equal(paymentStatusFromUala("REJECTED"), PAYMENT.REJECTED);
  assert.equal(paymentStatusFromUala("REFUNDED"), PAYMENT.REFUNDED);
  assert.equal(paymentStatusFromUala("PENDING"), PAYMENT.IN_PROCESS);
});
