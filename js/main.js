// Estado en memoria. No usamos localStorage: el sitio es de una sola
// página, así que el estado se mantiene mientras la persona no recargue.
const state = {
  cart: [], // { productId, variantId, quantity }
  selectedVariant: {}, // productId -> variantId elegido en la card
  appliedCode: null, // objeto de DISCOUNT_CODES o null
};

function getProduct(productId) {
  return PRODUCTS.find((p) => p.id === productId);
}

function getVariant(product, variantId) {
  if (!product.hasVariants) return null;
  return product.variants.find((v) => v.id === variantId) || null;
}

function isProductFullyOutOfStock(product) {
  if (!product.hasVariants) return !product.inStock;
  return product.variants.every((v) => !v.inStock);
}

/* ---------- Render de productos ---------- */

function renderProducts() {
  const grid = document.getElementById("products-grid");
  grid.innerHTML = "";

  PRODUCTS.forEach((product) => {
    if (product.hasVariants && !state.selectedVariant[product.id]) {
      const firstAvailable = product.variants.find((v) => v.inStock);
      state.selectedVariant[product.id] = firstAvailable
        ? firstAvailable.id
        : product.variants[0].id;
    }
    grid.appendChild(buildProductCard(product));
  });
}

function buildProductCard(product) {
  const outOfStock = isProductFullyOutOfStock(product);
  const card = document.createElement("article");
  card.className = "product-card" + (outOfStock ? " product-card--out" : "");

  const media = document.createElement("div");
  media.className = "product-card__media";
  media.innerHTML =
    `<img src="${product.image}" alt="${product.name}" loading="lazy">` +
    (product.badge && !outOfStock
      ? `<span class="badge badge--accent">${product.badge}</span>`
      : "") +
    (outOfStock ? `<span class="badge badge--out">Sin stock</span>` : "");
  card.appendChild(media);

  const body = document.createElement("div");
  body.className = "product-card__body";

  body.innerHTML = `
    <p class="product-card__weight">${product.weight}</p>
    <h3 class="product-card__name">${product.name}</h3>
    <p class="product-card__desc">${product.shortDescription}</p>
    <div class="product-card__price">
      <span class="price-current">${formatPrice(product.price)}</span>
      ${
        product.oldPrice
          ? `<span class="price-old">${formatPrice(product.oldPrice)}</span>`
          : ""
      }
    </div>
  `;

  if (product.hasVariants) {
    const variantWrap = document.createElement("div");
    variantWrap.className = "variant-select";
    product.variants.forEach((variant) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "variant-pill" +
        (state.selectedVariant[product.id] === variant.id
          ? " variant-pill--active"
          : "") +
        (!variant.inStock ? " variant-pill--disabled" : "");
      btn.textContent = variant.inStock
        ? variant.label
        : variant.label + " · Sin stock";
      btn.disabled = !variant.inStock;
      btn.addEventListener("click", () => {
        state.selectedVariant[product.id] = variant.id;
        renderProducts();
      });
      variantWrap.appendChild(btn);
    });
    body.appendChild(variantWrap);
  }

  const actions = document.createElement("div");
  actions.className = "product-card__actions";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn btn--primary";
  if (outOfStock) {
    addBtn.textContent = "Sin stock";
    addBtn.disabled = true;
  } else {
    addBtn.textContent = "Agregar al carrito";
    addBtn.addEventListener("click", () => addToCart(product.id));
  }

  const detailBtn = document.createElement("button");
  detailBtn.type = "button";
  detailBtn.className = "btn btn--ghost";
  detailBtn.textContent = "Ver detalle";
  detailBtn.addEventListener("click", () => openProductDetail(product));

  actions.appendChild(addBtn);
  actions.appendChild(detailBtn);
  body.appendChild(actions);

  card.appendChild(body);
  return card;
}

/* ---------- Detalle de producto ---------- */

function openProductDetail(product) {
  const modal = document.getElementById("product-modal");
  const content = document.getElementById("product-modal-content");

  content.innerHTML = `
    <h3>${product.name} — ${product.weight}</h3>
    <p>${product.description}</p>
    <h4>Características</h4>
    <ul>${product.features.map((f) => `<li>${f}</li>`).join("")}</ul>
    <h4>Modo de uso</h4>
    <p>${product.usage}</p>
    <h4>Ingredientes</h4>
    <p>${product.ingredients || "Información pendiente de confirmar."}</p>
    <h4>Advertencias</h4>
    <p class="text-muted">${product.warnings}</p>
  `;
  modal.classList.add("is-open");
  document.body.classList.add("no-scroll");
}

function closeProductDetail() {
  document.getElementById("product-modal").classList.remove("is-open");
  document.body.classList.remove("no-scroll");
}

/* ---------- Carrito ---------- */

function addToCart(productId) {
  const product = getProduct(productId);
  const variantId = product.hasVariants
    ? state.selectedVariant[productId]
    : null;

  const existing = state.cart.find(
    (item) => item.productId === productId && item.variantId === variantId
  );
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ productId, variantId, quantity: 1 });
  }
  renderCart();
  openCart();
}

function changeQuantity(index, delta) {
  const item = state.cart[index];
  item.quantity += delta;
  if (item.quantity <= 0) state.cart.splice(index, 1);
  renderCart();
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  renderCart();
}

function cartSubtotal() {
  return state.cart.reduce((sum, item) => {
    const product = getProduct(item.productId);
    return sum + product.price * item.quantity;
  }, 0);
}

function discountAmount(subtotal) {
  if (!state.appliedCode) return 0;
  return Math.round((subtotal * state.appliedCode.discountPercentage) / 100);
}

function renderCart() {
  const list = document.getElementById("cart-items");
  const count = state.cart.reduce((sum, i) => sum + i.quantity, 0);
  document.getElementById("cart-count").textContent = count;
  document.getElementById("cart-count").hidden = count === 0;

  if (state.cart.length === 0) {
    list.innerHTML = `<p class="cart-empty">Todavía no agregaste productos.</p>`;
  } else {
    list.innerHTML = state.cart
      .map((item, index) => {
        const product = getProduct(item.productId);
        const variant = getVariant(product, item.variantId);
        return `
        <div class="cart-item">
          <div class="cart-item__info">
            <p class="cart-item__name">${product.name}${
          variant ? " — " + variant.label : ""
        }</p>
            <p class="cart-item__price">${formatPrice(product.price)}</p>
          </div>
          <div class="cart-item__qty">
            <button type="button" data-qty-minus="${index}" aria-label="Restar">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-qty-plus="${index}" aria-label="Sumar">+</button>
          </div>
          <button type="button" class="cart-item__remove" data-remove="${index}" aria-label="Quitar">✕</button>
        </div>`;
      })
      .join("");

    list.querySelectorAll("[data-qty-minus]").forEach((btn) =>
      btn.addEventListener("click", () =>
        changeQuantity(Number(btn.dataset.qtyMinus), -1)
      )
    );
    list.querySelectorAll("[data-qty-plus]").forEach((btn) =>
      btn.addEventListener("click", () =>
        changeQuantity(Number(btn.dataset.qtyPlus), 1)
      )
    );
    list.querySelectorAll("[data-remove]").forEach((btn) =>
      btn.addEventListener("click", () =>
        removeFromCart(Number(btn.dataset.remove))
      )
    );
  }

  const subtotal = cartSubtotal();
  const discount = discountAmount(subtotal);
  const total = subtotal - discount;
  const freeShipping = subtotal >= CONFIG.shipping.freeShippingThreshold;

  document.getElementById("cart-subtotal").textContent = formatPrice(subtotal);
  document.getElementById("cart-total").textContent = formatPrice(total);

  const discountRow = document.getElementById("cart-discount-row");
  const removeBtn = document.getElementById("discount-remove");
  if (state.appliedCode && discount > 0) {
    discountRow.hidden = false;
    document.getElementById("cart-discount-code").textContent =
      state.appliedCode.code;
    document.getElementById("cart-discount-amount").textContent =
      "−" + formatPrice(discount);
    removeBtn.style.display = "flex";
  } else {
    discountRow.hidden = true;
    removeBtn.style.display = "none";
  }

  const shippingNote = document.getElementById("cart-shipping-note");
  if (state.cart.length === 0) {
    shippingNote.textContent = "";
  } else if (freeShipping) {
    shippingNote.textContent = "✓ Envío gratis en GBA por superar " + formatPrice(CONFIG.shipping.freeShippingThreshold);
  } else {
    const missing = CONFIG.shipping.freeShippingThreshold - subtotal;
    shippingNote.textContent =
      "Sumá " + formatPrice(missing) + " más para envío gratis en GBA.";
  }

  document.getElementById("checkout-btn").disabled = state.cart.length === 0;
}

/* ---------- Código de descuento ---------- */

function applyDiscountCode() {
  const input = document.getElementById("discount-input");
  const feedback = document.getElementById("discount-feedback");
  const code = input.value.trim().toUpperCase();

  if (!code) return;

  const match = DISCOUNT_CODES.find(
    (c) => c.code.toUpperCase() === code && c.active
  );

  if (!match) {
    state.appliedCode = null;
    feedback.textContent = "El código ingresado no es válido.";
    feedback.className = "discount-feedback discount-feedback--error";
    renderCart();
    return;
  }

  state.appliedCode = match;
  feedback.textContent = "Código de " + match.influencerName + " aplicado.";
  feedback.className = "discount-feedback discount-feedback--ok";
  renderCart();
}

function removeDiscountCode() {
  state.appliedCode = null;
  document.getElementById("discount-input").value = "";
  document.getElementById("discount-feedback").textContent = "";
  renderCart();
}

/* ---------- Checkout por WhatsApp ---------- */

function buildOrderSummary() {
  const lines = ["Hola MS, quiero hacer este pedido:", ""];
  state.cart.forEach((item) => {
    const product = getProduct(item.productId);
    const variant = getVariant(product, item.variantId);
    lines.push(
      `• ${item.quantity}x ${product.name}${
        variant ? " (" + variant.label + ")" : ""
      } — ${formatPrice(product.price * item.quantity)}`
    );
  });

  const subtotal = cartSubtotal();
  const discount = discountAmount(subtotal);
  lines.push("");
  lines.push("Subtotal: " + formatPrice(subtotal));
  if (state.appliedCode && discount > 0) {
    lines.push(
      "Código " + state.appliedCode.code + ": −" + formatPrice(discount)
    );
  }
  lines.push("Total: " + formatPrice(subtotal - discount));

  return lines.join("\n");
}

function checkout() {
  if (state.cart.length === 0) return;
  const message = buildOrderSummary();
  window.open(buildWhatsAppLink(CONFIG.whatsappNumber, message), "_blank");
}

/* ---------- Carrito: abrir / cerrar ---------- */

function openCart() {
  document.getElementById("cart-drawer").classList.add("is-open");
  document.getElementById("cart-overlay").classList.add("is-open");
  document.body.classList.add("no-scroll");
}

function closeCart() {
  document.getElementById("cart-drawer").classList.remove("is-open");
  document.getElementById("cart-overlay").classList.remove("is-open");
  document.body.classList.remove("no-scroll");
}

/* ---------- Menú mobile ---------- */

function toggleMobileMenu() {
  document.getElementById("mobile-menu").classList.toggle("is-open");
  document.getElementById("menu-toggle").classList.toggle("is-active");
}

/* ---------- FAQ ---------- */

function setupFaqAccordion() {
  document.querySelectorAll(".faq-item").forEach((item) => {
    const question = item.querySelector(".faq-item__question");
    question.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      document
        .querySelectorAll(".faq-item")
        .forEach((i) => i.classList.remove("is-open"));
      if (!isOpen) item.classList.add("is-open");
    });
  });
}

/* ---------- Inicialización ---------- */

document.addEventListener("DOMContentLoaded", () => {
  // Botón flotante de WhatsApp y CTAs de contacto
  document.querySelectorAll("[data-whatsapp-link]").forEach((el) => {
    el.href = buildWhatsAppLink(
      CONFIG.whatsappNumber,
      CONFIG.whatsappDefaultMessage
    );
  });
  document.querySelectorAll("[data-instagram-handle]").forEach((el) => {
    el.textContent = CONFIG.instagramHandle;
  });
  document.querySelectorAll("[data-instagram-link]").forEach((el) => {
    el.href = "https://instagram.com/" + CONFIG.instagramHandle.replace("@", "");
  });
  document.querySelectorAll("[data-email]").forEach((el) => {
    el.textContent = CONFIG.email;
  });
  document.querySelectorAll("[data-email-link]").forEach((el) => {
    el.href = "mailto:" + CONFIG.email;
  });
  document.querySelectorAll("[data-hours]").forEach((el) => {
    el.textContent = CONFIG.hours;
  });
  document.querySelectorAll("[data-free-shipping-threshold]").forEach((el) => {
    el.textContent = formatPrice(CONFIG.shipping.freeShippingThreshold);
  });

  renderProducts();
  renderCart();
  setupFaqAccordion();

  document.getElementById("cart-toggle").addEventListener("click", openCart);
  document.getElementById("cart-close").addEventListener("click", closeCart);
  document.getElementById("cart-overlay").addEventListener("click", closeCart);
  document
    .getElementById("menu-toggle")
    .addEventListener("click", toggleMobileMenu);
  document
    .getElementById("discount-apply")
    .addEventListener("click", applyDiscountCode);
  document
    .getElementById("discount-remove")
    .addEventListener("click", removeDiscountCode);
  document
    .getElementById("checkout-btn")
    .addEventListener("click", checkout);
  document
    .getElementById("product-modal-close")
    .addEventListener("click", closeProductDetail);
  document
    .getElementById("product-modal")
    .addEventListener("click", (e) => {
      if (e.target.id === "product-modal") closeProductDetail();
    });

  document.getElementById("year").textContent = new Date().getFullYear();

  // Cierra el menú mobile al tocar un link
  document.querySelectorAll("#mobile-menu a").forEach((link) => {
    link.addEventListener("click", () => {
      document.getElementById("mobile-menu").classList.remove("is-open");
      document.getElementById("menu-toggle").classList.remove("is-active");
    });
  });
});
