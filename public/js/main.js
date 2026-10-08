// Lógica de la tienda en el navegador.
// Importante: los totales que se muestran acá son una vista previa. El
// precio, el descuento y el total que valen son los que calcula el servidor
// (/api/quote y /api/orders), que también asigna el número de pedido.

import { CONFIG } from "../data/config.js";
import { PRODUCTS } from "../data/products.js";
import {
  formatPrice,
  buildWhatsAppLink,
  isWhatsAppConfigured,
  escapeHtml,
  api,
  storage,
  newIdempotencyKey,
} from "./utils.js";

const WA_OK = isWhatsAppConfigured(CONFIG.whatsappNumber);
const FREE_GBA =
  Number.isFinite(CONFIG.shipping.freeShippingThreshold) && CONFIG.shipping.freeShippingThreshold > 0
    ? CONFIG.shipping.freeShippingThreshold
    : null;

// Misma regla que src/shipping.js (solo para mostrar; decide el servidor).
// El envío por moto a GBA no tiene tarifa fija: se cotiza con Uber en el
// momento y se confirma por WhatsApp antes de cobrarlo.
function shippingInfo(zone, subtotal) {
  if (zone === "CABA") return { label: "Sin cargo (CABA)", pendingQuote: false };
  if (zone === "GBA") {
    if (FREE_GBA && subtotal >= FREE_GBA) return { label: "Gratis (GBA)", pendingQuote: false };
    return { label: "Moto a GBA: se cotiza con Uber al momento y te lo confirmamos por WhatsApp antes de cobrarlo", pendingQuote: true };
  }
  if (zone === "Otra") return { label: "A cotizar por WhatsApp antes de cobrarlo", pendingQuote: true };
  return null;
}
const $ = (id) => document.getElementById(id);

const state = {
  cart: storage.get("ms_cart", []), // { productId, variantId, quantity }
  code: storage.get("ms_code", null), // código aplicado (validado por el servidor)
  serverQuote: null, // última cotización del servidor (con código)
  selectedVariant: {},
  apiAvailable: true,
  mercadoPago: false,
};

/* ---------- Catálogo ---------- */

const getProduct = (id) => PRODUCTS.find((p) => p.id === id);
const getVariant = (product, variantId) =>
  product && product.hasVariants ? product.variants.find((v) => v.id === variantId) || null : null;
// Foto de la variante elegida (si tiene) o la del producto.
const imageFor = (product, variantId) => getVariant(product, variantId)?.image || product.image || (product.variants && product.variants[0].image) || "";
const isOutOfStock = (p) => (p.hasVariants ? p.variants.every((v) => !v.inStock) : !p.inStock);

function itemIsValid(item) {
  const p = getProduct(item.productId);
  if (!p) return false;
  if (p.hasVariants) {
    const v = getVariant(p, item.variantId);
    return Boolean(v && v.inStock);
  }
  return p.inStock;
}

function renderProducts() {
  const grid = $("products-grid");
  grid.innerHTML = "";
  PRODUCTS.forEach((product) => {
    if (product.hasVariants && !state.selectedVariant[product.id]) {
      const first = product.variants.find((v) => v.inStock) || product.variants[0];
      state.selectedVariant[product.id] = first.id;
    }
    grid.appendChild(buildProductCard(product));
  });
}

function buildProductCard(product) {
  const out = isOutOfStock(product);
  const card = document.createElement("article");
  card.className = "product-card" + (out ? " product-card--out" : "");
  const save = product.oldPrice && product.oldPrice > product.price ? product.oldPrice - product.price : 0;

  card.innerHTML = `
    <div class="product-card__media">
      <img src="${escapeHtml(imageFor(product, state.selectedVariant[product.id]))}" alt="${escapeHtml(product.name + " " + product.weight)}" loading="lazy" width="400" height="300">
      <div class="product-card__badges">
        ${product.badge && !out ? `<span class="badge badge--accent">${escapeHtml(product.badge)}</span>` : ""}
        ${out ? `<span class="badge badge--out">Sin stock</span>` : ""}
      </div>
    </div>
    <div class="product-card__body">
      <p class="product-card__weight">${escapeHtml(product.weight)}</p>
      <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
      <p class="product-card__desc">${escapeHtml(product.shortDescription)}</p>
      <div class="product-card__price">
        <span class="price-current">${formatPrice(product.price)}</span>
        ${product.oldPrice ? `<span class="price-old">${formatPrice(product.oldPrice)}</span>` : ""}
        ${save ? `<span class="price-save">Ahorrás ${formatPrice(save)}</span>` : ""}
      </div>
    </div>`;

  const body = card.querySelector(".product-card__body");

  if (product.hasVariants) {
    const wrap = document.createElement("div");
    wrap.className = "variant-select";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", product.variantLabel || "Opción");
    wrap.innerHTML = `<span class="variant-select__label">${escapeHtml(product.variantLabel || "Opción")}</span>`;
    product.variants.forEach((variant) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "variant-pill";
      btn.textContent = variant.inStock ? variant.label : variant.label + " · sin stock";
      btn.disabled = !variant.inStock;
      btn.setAttribute("aria-pressed", String(state.selectedVariant[product.id] === variant.id));
      btn.addEventListener("click", () => {
        state.selectedVariant[product.id] = variant.id;
        card.querySelector(".product-card__media img").src = imageFor(product, variant.id);
        wrap.querySelectorAll(".variant-pill").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      });
      wrap.appendChild(btn);
    });
    body.appendChild(wrap);
  }

  const actions = document.createElement("div");
  actions.className = "product-card__actions";
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn btn--primary";
  addBtn.textContent = out ? "Sin stock" : "Agregar al carrito";
  addBtn.disabled = out;
  addBtn.addEventListener("click", () => addToCart(product.id));
  const detailBtn = document.createElement("button");
  detailBtn.type = "button";
  detailBtn.className = "btn btn--ghost";
  detailBtn.textContent = "Detalle";
  detailBtn.setAttribute("aria-label", "Ver detalle de " + product.name);
  detailBtn.addEventListener("click", () => openProductDetail(product));
  actions.append(addBtn, detailBtn);
  body.appendChild(actions);
  return card;
}

/* ---------- Detalle de producto ---------- */

function openProductDetail(product) {
  const modal = $("product-modal");
  $("product-modal-content").innerHTML = `
    <p class="eyebrow">${escapeHtml(product.weight)}</p>
    <h2 id="product-modal-title">${escapeHtml(product.name)}</h2>
    <p>${escapeHtml(product.description)}</p>
    <h3>Características</h3>
    <ul>${product.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
    <h3>Modo de uso</h3>
    <p>${escapeHtml(product.usage)}</p>
    <h3>Ingredientes</h3>
    <p>${escapeHtml(product.ingredients || "Información pendiente de confirmar.")}</p>
    <h3>Advertencias</h3>
    <p class="modal__warning">${escapeHtml(product.warnings)}</p>
    ${isOutOfStock(product) ? "" : `<button type="button" class="btn btn--primary btn--block modal__cta" data-modal-add>Agregar al carrito · ${formatPrice(product.price)}</button>`}`;
  const cta = modal.querySelector("[data-modal-add]");
  if (cta) cta.addEventListener("click", () => { modal.close(); addToCart(product.id); });
  if (typeof modal.showModal === "function") modal.showModal();
  else modal.setAttribute("open", "");
}

/* ---------- Carrito ---------- */

function saveCart() {
  storage.set("ms_cart", state.cart);
}

function addToCart(productId) {
  const product = getProduct(productId);
  const variantId = product.hasVariants ? state.selectedVariant[productId] : null;
  const existing = state.cart.find((i) => i.productId === productId && i.variantId === variantId);
  if (existing) existing.quantity = Math.min(existing.quantity + 1, 20);
  else state.cart.push({ productId, variantId, quantity: 1 });
  saveCart();
  onCartChanged();
  const count = $("cart-count");
  count.classList.remove("bump");
  void count.offsetWidth;
  count.classList.add("bump");
  openDrawer("cart");
}

function changeQuantity(index, delta) {
  const item = state.cart[index];
  if (!item) return;
  item.quantity = Math.min(item.quantity + delta, 20);
  if (item.quantity <= 0) state.cart.splice(index, 1);
  saveCart();
  onCartChanged();
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  saveCart();
  onCartChanged();
}

const localSubtotal = () =>
  state.cart.reduce((sum, i) => sum + (getProduct(i.productId)?.price || 0) * i.quantity, 0);

const cartPayloadItems = () =>
  state.cart.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }));

function renderCart() {
  const list = $("cart-items");
  const count = state.cart.reduce((s, i) => s + i.quantity, 0);
  $("cart-count").textContent = count;
  $("cart-count").hidden = count === 0;

  if (state.cart.length === 0) {
    list.innerHTML = `<div class="cart-empty"><p>Todavía no agregaste productos.</p><a href="#productos" class="btn btn--ghost" data-close-drawer>Ver productos</a></div>`;
  } else {
    list.innerHTML = state.cart
      .map((item, index) => {
        const p = getProduct(item.productId);
        const v = getVariant(p, item.variantId);
        return `
        <div class="cart-item">
          <div class="cart-item__thumb"><img src="${escapeHtml(imageFor(p, item.variantId))}" alt=""></div>
          <div>
            <p class="cart-item__name">${escapeHtml(p.name)}${v ? " — " + escapeHtml(v.label) : ""}</p>
            <p class="cart-item__price">${formatPrice(p.price)} c/u · ${formatPrice(p.price * item.quantity)}</p>
          </div>
          <div class="cart-item__side">
            <div class="qty">
              <button type="button" data-qty="${index}" data-delta="-1" aria-label="Restar uno">−</button>
              <span aria-live="polite">${item.quantity}</span>
              <button type="button" data-qty="${index}" data-delta="1" aria-label="Sumar uno">+</button>
            </div>
            <button type="button" class="cart-item__remove" data-remove="${index}">Quitar</button>
          </div>
        </div>`;
      })
      .join("");
  }

  const subtotal = localSubtotal();
  const q = state.code && state.serverQuote && state.serverQuote.subtotal === subtotal ? state.serverQuote : null;
  const discount = q ? q.discount : 0;

  $("cart-subtotal").textContent = formatPrice(subtotal);
  $("cart-total").textContent = formatPrice(subtotal - discount);
  $("cart-discount-row").hidden = !q || discount <= 0;
  if (q) {
    $("cart-discount-code").textContent = q.creatorCode;
    $("cart-discount-amount").textContent = "−" + formatPrice(discount);
  }

  const note = $("cart-shipping-note");
  note.className = "summary__note";
  if (state.cart.length === 0) note.textContent = "";
  else if (FREE_GBA && subtotal >= FREE_GBA) {
    note.textContent = "✓ Envío gratis en GBA. En CABA, siempre sin cargo.";
    note.classList.add("summary__note--ok");
  } else if (FREE_GBA) {
    note.textContent = `CABA sin cargo. GBA: envío por moto, cotizado con Uber al momento (gratis sumando ${formatPrice(FREE_GBA - subtotal)} más).`;
  } else note.textContent = "CABA sin cargo. GBA: envío por moto, cotizado con Uber al momento y confirmado por WhatsApp.";

  $("checkout-btn").disabled = state.cart.length === 0;
}

let quoteTimer = null;
function onCartChanged() {
  state.cart = state.cart.filter(itemIsValid);
  renderCart();
  if (state.code && state.cart.length) {
    clearTimeout(quoteTimer);
    quoteTimer = setTimeout(() => requestQuote(state.code, { silent: true }), 250);
  }
}

/* ---------- Código de creador (validado en el servidor) ---------- */

function setFeedback(el, text, kind) {
  el.textContent = text || "";
  el.className = "feedback" + (kind ? " feedback--" + kind : "");
}

async function requestQuote(code, { silent = false } = {}) {
  const feedback = $("discount-feedback");
  let res;
  try {
    res = await api("/api/quote", { items: cartPayloadItems(), creatorCode: code || "" });
  } catch {
    if (!silent) setFeedback(feedback, "No pudimos validar el código. Revisá tu conexión.", "error");
    return null;
  }
  if (!res.ok) {
    if (!silent) setFeedback(feedback, res.data?.error?.message || "No pudimos validar el código en este momento.", "error");
    return null;
  }
  const { quote, code: codeInfo } = res.data;
  if (codeInfo.status === "applied") {
    state.code = quote.creatorCode;
    state.serverQuote = quote;
    storage.set("ms_code", state.code);
    if (!silent) setFeedback(feedback, codeInfo.message, "ok");
  } else if (codeInfo.status === "invalid") {
    state.code = null;
    state.serverQuote = null;
    storage.remove("ms_code");
    setFeedback(feedback, codeInfo.message, "error");
  }
  renderCart();
  return res.data;
}

async function applyDiscountCode(e) {
  e.preventDefault();
  const input = $("discount-input");
  const code = input.value.trim().toUpperCase();
  if (!code) return;
  if (!state.cart.length) {
    setFeedback($("discount-feedback"), "Agregá productos antes de aplicar un código.", "warn");
    return;
  }
  const btn = $("discount-apply");
  btn.disabled = true;
  await requestQuote(code);
  btn.disabled = false;
}

function removeDiscountCode() {
  state.code = null;
  state.serverQuote = null;
  storage.remove("ms_code");
  $("discount-input").value = "";
  setFeedback($("discount-feedback"), "");
  renderCart();
}

/* ---------- Drawer: vistas ---------- */

const VIEWS = {
  cart: { el: "view-cart", title: "Tu carrito", step: "Paso 1 de 2" },
  checkout: { el: "view-checkout", title: "Confirmá tu pedido", step: "Paso 2 de 2" },
  done: { el: "view-done", title: "¡Listo!", step: "Pedido registrado" },
};

function showView(name) {
  Object.entries(VIEWS).forEach(([key, v]) => ($(v.el).hidden = key !== name));
  $("drawer-title").textContent = VIEWS[name].title;
  $("drawer-step-label").textContent = VIEWS[name].step;
  $("cart-drawer").scrollTop = 0;
}

function openDrawer(view = "cart") {
  showView(view);
  $("cart-drawer").classList.add("is-open");
  $("cart-drawer").setAttribute("aria-hidden", "false");
  $("cart-overlay").hidden = false;
  document.body.classList.add("no-scroll");
  $("cart-close").focus({ preventScroll: true });
}

function closeDrawer() {
  $("cart-drawer").classList.remove("is-open");
  $("cart-drawer").setAttribute("aria-hidden", "true");
  $("cart-overlay").hidden = true;
  document.body.classList.remove("no-scroll");
  if (!$("view-done").hidden) showView("cart");
}

/* ---------- Checkout ---------- */

let checkoutQuote = null;

function renderSummary(container, quote, zone) {
  const ship = shippingInfo(zone, quote.subtotal);
  const shipNote = ship
    ? `Envío: ${escapeHtml(ship.label)}.`
    : `Envío: CABA sin cargo · GBA por moto, cotizado con Uber al momento${FREE_GBA ? ` (gratis desde ${formatPrice(FREE_GBA)})` : ""}.`;
  container.innerHTML = `
    ${quote.lines
      .map((l) => `<div class="summary__row summary__row--line"><span>${l.quantity}× ${escapeHtml(l.name)}</span><span>${formatPrice(l.lineTotal)}</span></div>`)
      .join("")}
    <div class="summary__row"><span>Subtotal</span><span>${formatPrice(quote.subtotal)}</span></div>
    ${quote.discount > 0 ? `<div class="summary__row summary__row--discount"><span>Código ${escapeHtml(quote.creatorCode)} (−10%)</span><span>−${formatPrice(quote.discount)}</span></div>` : ""}
    <div class="summary__row summary__row--total"><span>${ship && ship.pendingQuote ? "Total productos" : "Total"}</span><span>${formatPrice(quote.total)}</span></div>
    <p class="summary__note">${shipNote}</p>`;
}

const currentZone = () => String(new FormData($("checkout-form")).get("zone") || "");

// Si el envío queda a cotizar (GBA por moto / otra zona), no se puede pagar
// online todavía: el pedido se registra y se coordina por WhatsApp.
function updatePaymentOptions() {
  const mpOption = $("pay-option-mp");
  const mpRadio = mpOption.querySelector("input");
  const ship = checkoutQuote ? shippingInfo(currentZone(), checkoutQuote.subtotal) : null;
  const blocked = Boolean(ship && ship.pendingQuote);
  mpOption.hidden = !state.mercadoPago;
  mpRadio.disabled = blocked;
  mpOption.classList.toggle("pay-option--disabled", blocked);
  $("pay-option-mp-note").hidden = !blocked || !state.mercadoPago;
  if (blocked && mpRadio.checked) {
    document.querySelector('input[name="paymentMethod"][value="whatsapp"]').checked = true;
  }
  if (checkoutQuote) renderSummary($("checkout-summary"), checkoutQuote, currentZone());
  updateConfirmLabel();
}

function updateConfirmLabel() {
  const btn = $("confirm-btn");
  const method = new FormData($("checkout-form")).get("paymentMethod");
  const total = checkoutQuote ? " · " + formatPrice(checkoutQuote.total) : "";
  btn.textContent = (method === "mercadopago" ? "Pagar con Mercado Pago" : "Confirmar pedido") + total;
}

async function goToCheckout() {
  if (!state.cart.length) return;
  if (!state.apiAvailable) {
    showToast("La compra online no está disponible en este momento. Escribinos por WhatsApp.");
    return;
  }
  showView("checkout");
  setFeedback($("checkout-feedback"), "");
  $("checkout-summary").innerHTML = `<p class="summary__note">Calculando total…</p>`;
  $("confirm-btn").disabled = true;
  const data = await requestQuote(state.code, { silent: true });
  if (!data) {
    $("checkout-summary").innerHTML = "";
    setFeedback($("checkout-feedback"), "No pudimos calcular el total. Probá de nuevo en unos segundos.", "error");
    return;
  }
  checkoutQuote = data.quote;
  $("confirm-btn").disabled = false;
  updatePaymentOptions();
  updateConfirmLabel();
}

function readCustomer(form) {
  const fd = new FormData(form);
  return {
    name: String(fd.get("name") || "").trim(),
    phone: String(fd.get("phone") || "").trim(),
    email: String(fd.get("email") || "").trim(),
    zone: String(fd.get("zone") || ""),
    notes: String(fd.get("notes") || "").trim(),
    paymentMethod: String(fd.get("paymentMethod") || ""),
  };
}

function validateForm(form, c) {
  let firstInvalid = null;
  const mark = (name, bad) => {
    const el = form.elements[name];
    if (!el || !el.setAttribute) return;
    el.setAttribute("aria-invalid", String(bad));
    if (bad && !firstInvalid) firstInvalid = el;
  };
  mark("name", c.name.length < 2);
  const digits = c.phone.replace(/\D/g, "");
  mark("phone", digits.length < 8 || digits.length > 15);
  mark("email", Boolean(c.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email));
  mark("zone", !c.zone);
  if (firstInvalid) {
    firstInvalid.focus();
    return "Revisá los datos marcados.";
  }
  if (!c.paymentMethod) return "Elegí cómo querés pagar.";
  return null;
}

// Misma clave mientras el contenido del pedido no cambie: si el cliente
// reintenta (doble clic, corte de conexión), el servidor no duplica el pedido.
function idempotencyKeyFor(payload) {
  const fingerprint = JSON.stringify([payload.items, payload.creatorCode, payload.paymentMethod, payload.customer]);
  const saved = storage.get("ms_checkout_key");
  if (saved && saved.fingerprint === fingerprint) return saved.key;
  const key = newIdempotencyKey();
  storage.set("ms_checkout_key", { key, fingerprint });
  return key;
}

let submitting = false;
async function submitOrder(e) {
  e.preventDefault();
  if (submitting || !checkoutQuote) return;
  const form = $("checkout-form");
  const feedback = $("checkout-feedback");
  const c = readCustomer(form);
  const error = validateForm(form, c);
  if (error) return setFeedback(feedback, error, "error");

  const payload = {
    items: cartPayloadItems(),
    creatorCode: state.code || "",
    paymentMethod: c.paymentMethod,
    customer: { name: c.name, phone: c.phone, email: c.email, zone: c.zone, notes: c.notes },
    expectedTotal: checkoutQuote.total,
  };
  payload.idempotencyKey = idempotencyKeyFor(payload);

  const btn = $("confirm-btn");
  submitting = true;
  btn.classList.add("is-loading");
  btn.disabled = true;
  setFeedback(feedback, "");

  let res;
  try {
    res = await api("/api/orders", payload);
  } catch {
    res = null;
  }
  submitting = false;
  btn.classList.remove("is-loading");
  btn.disabled = false;
  updateConfirmLabel();

  if (!res) return setFeedback(feedback, "No pudimos conectarnos. Revisá tu conexión y tocá confirmar de nuevo: no se va a duplicar el pedido.", "error");

  const code = res.data?.error?.code;
  if (res.ok) return onOrderCreated(res.data, c);

  if (code === "total_changed" && res.data.quote) {
    checkoutQuote = res.data.quote;
    renderSummary($("checkout-summary"), checkoutQuote, c.zone);
    updateConfirmLabel();
    return setFeedback(feedback, "El total se actualizó. Revisalo y confirmá de nuevo.", "warn");
  }
  if (code === "invalid_code") {
    removeDiscountCode();
    if (res.data.quote) {
      checkoutQuote = res.data.quote;
      renderSummary($("checkout-summary"), checkoutQuote, c.zone);
      updateConfirmLabel();
    }
    return setFeedback(feedback, res.data.error.message + " Revisá el nuevo total y confirmá de nuevo.", "error");
  }
  if (code === "idempotency_conflict") storage.remove("ms_checkout_key");
  if (code === "mp_not_configured") $("pay-option-mp").hidden = true;
  if (code === "shipping_quote_required") updatePaymentOptions();
  setFeedback(feedback, res.data?.error?.message || "No pudimos registrar el pedido. Probá de nuevo.", "error");
}

function orderWhatsAppMessage(order, customer) {
  const lines = [`Hola MYS, hice el pedido ${order.orderNumber}:`, ""];
  order.items.forEach((l) => lines.push(`• ${l.quantity}x ${l.name} — ${formatPrice(l.lineTotal)}`));
  lines.push("", "Subtotal: " + formatPrice(order.subtotal));
  if (order.discount > 0) lines.push(`Código ${order.creatorCode}: −${formatPrice(order.discount)}`);
  lines.push("Total productos: " + formatPrice(order.total));
  if (order.shippingStatus) lines.push("Envío: " + order.shippingStatus);
  lines.push("", `Nombre: ${customer.name}`, `Zona: ${customer.zone}`);
  if (order.paymentMethod === "mercadopago") lines.push("Pago: Mercado Pago");
  return lines.join("\n");
}

function resetAfterOrder() {
  state.cart = [];
  saveCart();
  removeDiscountCode();
  storage.remove("ms_checkout_key");
  checkoutQuote = null;
  $("checkout-form").reset();
  renderCart();
}

function onOrderCreated(order, customer) {
  if (order.paymentMethod === "mercadopago" && order.checkoutUrl) {
    storage.set("ms_last_order", { n: order.orderNumber, t: order.publicToken });
    resetAfterOrder();
    window.location.href = order.checkoutUrl;
    return;
  }
  $("done-number").textContent = order.orderNumber;
  renderSummary($("done-summary"), {
    lines: order.items,
    subtotal: order.subtotal,
    discount: order.discount,
    creatorCode: order.creatorCode,
    total: order.total,
  }, customer.zone);
  const wa = $("done-whatsapp");
  if (WA_OK) {
    wa.hidden = false;
    wa.href = buildWhatsAppLink(CONFIG.whatsappNumber, orderWhatsAppMessage(order, customer));
    $("done-text").textContent = order.shippingCost === null
      ? "Guardá este número. Envianos el pedido por WhatsApp: cotizamos el envío con Uber y te confirmamos el total antes de cobrar."
      : "Guardá este número. Envianos el pedido por WhatsApp para coordinar el pago y la entrega.";
  } else {
    wa.hidden = true;
    $("done-text").textContent = "Guardá este número. Te vamos a contactar al WhatsApp que nos dejaste para coordinar el pago y la entrega.";
  }
  resetAfterOrder();
  showView("done");
}

/* ---------- Varios ---------- */

let toastTimer = null;
function showToast(text) {
  const t = $("toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 4000);
}

function toggleMobileMenu(force) {
  const menu = $("mobile-menu");
  const open = typeof force === "boolean" ? force : !menu.classList.contains("is-open");
  menu.classList.toggle("is-open", open);
  $("menu-toggle").setAttribute("aria-expanded", String(open));
  $("menu-toggle").setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
}

function bindBusinessInfo() {
  const waLink = buildWhatsAppLink(CONFIG.whatsappNumber, CONFIG.whatsappDefaultMessage);
  document.querySelectorAll("[data-whatsapp-link]").forEach((el) => {
    if (WA_OK) {
      el.href = waLink;
      el.target = "_blank";
      el.rel = "noopener";
    } else {
      el.removeAttribute("href");
      el.setAttribute("aria-disabled", "true");
    }
  });
  if (!WA_OK) {
    console.warn("[MYS] Falta configurar el número de WhatsApp en public/data/config.js");
    const row = document.querySelector('[data-contact-row="whatsapp"] dd');
    if (row) row.textContent = "Próximamente";
  }
  const handle = CONFIG.instagramHandle;
  document.querySelectorAll("[data-instagram-handle]").forEach((el) => (el.textContent = handle));
  document.querySelectorAll("[data-instagram-link]").forEach((el) => (el.href = "https://instagram.com/" + handle.replace("@", "")));
  if (CONFIG.email) {
    document.querySelector('[data-contact-row="email"]').hidden = false;
    document.querySelectorAll("[data-email]").forEach((el) => (el.textContent = CONFIG.email));
    document.querySelectorAll("[data-email-link]").forEach((el) => (el.href = "mailto:" + CONFIG.email));
  }
  if (CONFIG.hours) {
    document.querySelector('[data-contact-row="hours"]').hidden = false;
    document.querySelectorAll("[data-hours]").forEach((el) => (el.textContent = CONFIG.hours));
  }
  // Textos que dependen del envío gratis en GBA (se ocultan si no hay umbral).
  document.querySelectorAll("[data-free-shipping-threshold]").forEach(
    (el) => (el.textContent = FREE_GBA ? formatPrice(FREE_GBA) : "")
  );
  document.querySelectorAll("[data-if-free-shipping]").forEach((el) => (el.hidden = !FREE_GBA));
  document.querySelectorAll("[data-whatsapp-display]").forEach((el) => (el.textContent = CONFIG.whatsappDisplay));
  $("year").textContent = new Date().getFullYear();
}

async function loadServerConfig() {
  try {
    const res = await api("/api/config");
    state.apiAvailable = Boolean(res.ok);
    state.mercadoPago = Boolean(res.ok && res.data.mercadoPago);
  } catch {
    state.apiAvailable = false;
  }
  $("pay-option-mp").hidden = !state.mercadoPago;
  const radios = document.querySelectorAll('input[name="paymentMethod"]');
  const preferred = state.mercadoPago ? "mercadopago" : "whatsapp";
  radios.forEach((r) => (r.checked = r.value === preferred));
  if (state.mercadoPago) {
    document.querySelectorAll("[data-faq-payments]").forEach(
      (el) => (el.textContent = "Podés pagar online con Mercado Pago al confirmar tu pedido, o confirmarlo y coordinar el pago por WhatsApp.")
    );
    document.querySelectorAll("[data-payment-copy]").forEach(
      (el) => (el.textContent = "Pagás online con Mercado Pago o coordinamos el pago")
    );
  }
  if (!state.apiAvailable) console.warn("[MYS] La API (/api) no responde: el checkout queda deshabilitado.");
}

/* ---------- Inicio ---------- */

document.addEventListener("DOMContentLoaded", () => {
  bindBusinessInfo();
  renderProducts();
  state.cart = state.cart.filter(itemIsValid);
  renderCart();
  loadServerConfig().then(() => {
    if (state.code && state.cart.length) requestQuote(state.code, { silent: true });
  });

  $("cart-toggle").addEventListener("click", () => openDrawer("cart"));
  $("cart-close").addEventListener("click", closeDrawer);
  $("cart-overlay").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("cart-drawer").classList.contains("is-open")) closeDrawer();
  });

  $("cart-items").addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (!t) return;
    if (t.dataset.qty !== undefined) changeQuantity(Number(t.dataset.qty), Number(t.dataset.delta));
    else if (t.dataset.remove !== undefined) removeFromCart(Number(t.dataset.remove));
    else if (t.hasAttribute("data-close-drawer")) closeDrawer();
  });

  $("discount-form").addEventListener("submit", applyDiscountCode);
  $("discount-remove").addEventListener("click", removeDiscountCode);
  $("checkout-btn").addEventListener("click", goToCheckout);
  $("back-to-cart").addEventListener("click", () => showView("cart"));
  $("checkout-form").addEventListener("submit", submitOrder);
  $("checkout-form").addEventListener("change", (e) => {
    if (e.target.name === "paymentMethod") updateConfirmLabel();
    if (e.target.name === "zone") updatePaymentOptions();
    if (e.target.getAttribute("aria-invalid") === "true") e.target.setAttribute("aria-invalid", "false");
  });
  $("done-close").addEventListener("click", closeDrawer);

  $("menu-toggle").addEventListener("click", () => toggleMobileMenu());
  document.querySelectorAll("#mobile-menu a").forEach((a) => a.addEventListener("click", () => toggleMobileMenu(false)));

  const modal = $("product-modal");
  $("product-modal-close").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.close();
  });
});
