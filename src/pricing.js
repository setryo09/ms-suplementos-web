// Cálculo de precios del lado del servidor.
// Los precios salen SIEMPRE del catálogo (public/data/products.js); del
// navegador solo se aceptan ids de producto/variante y cantidades.

import { PRODUCTS } from "../public/data/products.js";

// Descuento fijo de todo código de creador válido, sobre el subtotal de productos.
export const CREATOR_DISCOUNT_PERCENT = 10;

export const MAX_LINES = 10;
export const MAX_QTY_PER_LINE = 20;

export class ValidationError extends Error {
  constructor(message, code = "invalid_request") {
    super(message);
    this.code = code;
  }
}

export function normalizeCode(raw) {
  if (raw == null) return "";
  return String(raw).trim().toUpperCase().slice(0, 40);
}

// Valida y normaliza los ítems enviados por el navegador.
// Devuelve líneas con precio de catálogo. Agrupa ítems repetidos.
export function priceItems(rawItems, products = PRODUCTS) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new ValidationError("El carrito está vacío.", "empty_cart");
  }
  if (rawItems.length > MAX_LINES) {
    throw new ValidationError("Demasiados productos distintos en el pedido.");
  }

  const merged = new Map();
  for (const raw of rawItems) {
    const productId = typeof raw?.productId === "string" ? raw.productId : "";
    const variantId =
      typeof raw?.variantId === "string" && raw.variantId ? raw.variantId : null;
    const quantity = raw?.quantity;

    const product = products.find((p) => p.id === productId);
    if (!product) throw new ValidationError("Hay un producto que ya no existe.", "unknown_product");

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
      throw new ValidationError(
        `La cantidad de cada producto debe ser entre 1 y ${MAX_QTY_PER_LINE}.`,
        "invalid_quantity"
      );
    }

    let variant = null;
    if (product.hasVariants) {
      variant = product.variants.find((v) => v.id === variantId);
      if (!variant) throw new ValidationError(`Elegí una variante de ${product.name}.`, "invalid_variant");
      if (!variant.inStock) {
        throw new ValidationError(`${product.name} (${variant.label}) no tiene stock.`, "out_of_stock");
      }
    } else {
      if (variantId) throw new ValidationError("Variante inválida.", "invalid_variant");
      if (!product.inStock) throw new ValidationError(`${product.name} no tiene stock.`, "out_of_stock");
    }

    const key = product.id + "|" + (variant ? variant.id : "");
    const prev = merged.get(key);
    const qty = (prev ? prev.quantity : 0) + quantity;
    if (qty > MAX_QTY_PER_LINE) {
      throw new ValidationError(
        `La cantidad de cada producto debe ser entre 1 y ${MAX_QTY_PER_LINE}.`,
        "invalid_quantity"
      );
    }
    merged.set(key, {
      productId: product.id,
      variantId: variant ? variant.id : null,
      name: product.name + " " + product.weight + (variant ? " (" + variant.label + ")" : ""),
      unitPrice: product.price,
      quantity: qty,
      lineTotal: product.price * qty,
    });
  }
  return [...merged.values()];
}

// creatorCode: fila de la tabla creator_codes (o null si no existe).
export function buildQuote(lines, creatorCode) {
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const discount =
    creatorCode && creatorCode.active
      ? Math.round((subtotal * CREATOR_DISCOUNT_PERCENT) / 100)
      : 0;
  return {
    lines,
    subtotal,
    creatorCode: creatorCode && creatorCode.active ? creatorCode.code : null,
    discountPercent: discount > 0 ? CREATOR_DISCOUNT_PERCENT : 0,
    discount,
    total: subtotal - discount,
  };
}
