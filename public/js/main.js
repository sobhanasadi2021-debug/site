/* ============================================================
   MAISON NOIR — client behaviour
   slider · bag · cart & checkout · coupons · wishlist · i18n toasts
   ============================================================ */

const STR = {
  en: {
    added: 'added to your bag',
    removed: 'removed',
    bagEmpty: 'Your bag is empty',
    bagEmptyP: 'The collection awaits your discerning eye.',
    discover: 'Discover the Collection',
    subtotal: 'Subtotal',
    total: 'Total',
    discount: 'Discount',
    couponApplied: 'Code applied —',
    couponInvalid: 'This code is not valid.',
  },
  fa: {
    added: 'به سبد شما اضافه شد',
    removed: 'حذف شد',
    bagEmpty: 'سبد شما خالی است',
    bagEmptyP: 'کالکشن منتظر سلیقه شماست.',
    discover: 'کشف کالکشن',
    subtotal: 'جمع جزء',
    total: 'جمع کل',
    discount: 'تخفیف',
    couponApplied: 'کد اعمال شد —',
    couponInvalid: 'این کد معتبر نیست.',
  },
};
const S = STR[document.documentElement.lang] || STR.en;

/* ---------------- Hero slider ---------------- */
(function initSlider() {
  const slider = document.getElementById('hero-slider');
  if (!slider) return;

  const slides = [...slider.querySelectorAll('.slide')];
  const dots = [...slider.querySelectorAll('.dot')];
  let current = 0;
  let timer = null;

  function show(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('active', i === current));
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function play() {
    clearInterval(timer);
    timer = setInterval(() => show(current + 1), 6000);
  }

  slider.querySelector('.prev').addEventListener('click', () => { show(current - 1); play(); });
  slider.querySelector('.next').addEventListener('click', () => { show(current + 1); play(); });
  dots.forEach(d => d.addEventListener('click', () => { show(Number(d.dataset.index)); play(); }));

  slider.addEventListener('mouseenter', () => clearInterval(timer));
  slider.addEventListener('mouseleave', play);

  let startX = null;
  slider.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) { show(dx < 0 ? current + 1 : current - 1); play(); }
    startX = null;
  }, { passive: true });

  play();
})();

/* ---------------- Mobile nav ---------------- */
(function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) toggle.addEventListener('click', () => nav.classList.toggle('open'));
})();

/* ---------------- Shopping bag (localStorage) ---------------- */

const BAG_KEY = 'maison-noir-bag';

function getBag() {
  try { return JSON.parse(localStorage.getItem(BAG_KEY)) || []; }
  catch { return []; }
}
function saveBag(bag) {
  localStorage.setItem(BAG_KEY, JSON.stringify(bag));
  updateBagCount();
}
function bagSubtotal(bag) {
  return bag.reduce((sum, it) => sum + it.price * it.qty, 0);
}
const bagTotal = () => Math.max(0, bagSubtotal(getBag()) - (window.__discount || 0));
function updateBagCount() {
  const el = document.getElementById('bag-count');
  if (el) el.textContent = getBag().reduce((n, it) => n + it.qty, 0);
}

function addToBag(product) {
  const bag = getBag();
  const existing = bag.find(it => it.id === product.id);
  if (existing) existing.qty += 1;
  else bag.push({ ...product, qty: 1 });
  saveBag(bag);
  toast(`${product.name} ${S.added}`);
}

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-to-bag');
  if (!btn || btn.disabled) return;
  addToBag({
    id: Number(btn.dataset.id),
    name: btn.dataset.name,
    price: Number(btn.dataset.price),
    image: btn.dataset.image,
  });
});

/* ---------------- Wishlist (server-side) ---------------- */
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.wishlist-btn[data-id]');
  if (!btn) return;
  try {
    const res = await fetch('/api/wishlist/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: Number(btn.dataset.id) }),
    });
    const json = await res.json();
    if (res.status === 401) { window.location.href = '/login?next=' + encodeURIComponent(location.pathname); return; }
    if (json.ok) {
      btn.classList.toggle('active', json.added);
      btn.innerHTML = (json.added ? '♥' : '♡') + ' <span>' + btn.querySelector('span').textContent + '</span>';
    }
  } catch { /* ignore */ }
});

/* ---------------- Cart page ---------------- */
const cartRoot = document.getElementById('cart-root');
if (cartRoot) renderCart();

function renderCart() {
  const bag = getBag();
  if (bag.length === 0) {
    cartRoot.innerHTML = `
      <div class="empty-state">
        <h2 style="font-family:var(--serif);font-size:1.8rem">${S.bagEmpty}</h2>
        <p class="muted">${S.bagEmptyP}</p>
        <a href="/shop" class="btn btn-gold">${S.discover}</a>
      </div>`;
    return;
  }

  const rows = bag.map(it => `
    <div class="cart-row">
      <img src="${it.image}" alt="${it.name}">
      <div><h3>${it.name}</h3><p class="cart-price">$${it.price.toFixed(2)}</p></div>
      <div class="qty-controls">
        <button class="qty-btn" data-action="dec" data-id="${it.id}">−</button>
        <span>${it.qty}</span>
        <button class="qty-btn" data-action="inc" data-id="${it.id}">+</button>
      </div>
      <span class="cart-price">$${(it.price * it.qty).toFixed(2)}</span>
      <button class="remove-btn" data-action="remove" data-id="${it.id}">${S.removed}</button>
    </div>`).join('');

  cartRoot.innerHTML = `
    ${rows}
    <div class="cart-summary">
      <a href="/shop" class="btn btn-outline">←</a>
      <span class="muted">${S.total}&nbsp;&nbsp;</span>
      <span class="total">$${bagSubtotal(bag).toFixed(2)}</span>
      <a href="/checkout" class="btn btn-gold">✓</a>
    </div>`;

  cartRoot.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const bagNow = getBag();
      const id = Number(btn.dataset.id);
      const item = bagNow.find(it => it.id === id);
      if (!item) return;
      if (btn.dataset.action === 'inc') item.qty += 1;
      if (btn.dataset.action === 'dec') item.qty = Math.max(1, item.qty - 1);
      if (btn.dataset.action === 'remove') {
        bagNow.splice(bagNow.indexOf(item), 1);
        toast(`${item.name} ${S.removed}`);
      }
      saveBag(bagNow);
      renderCart();
    });
  });
}

/* ---------------- Checkout page ---------------- */
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
  const itemsEl = document.getElementById('summary-items');
  const totalEl = document.getElementById('summary-total');
  const discountRow = document.getElementById('summary-discount');
  const discountEl = document.getElementById('discount-amount');
  const couponInput = document.getElementById('coupon-input');
  const couponBtn = document.getElementById('coupon-apply');
  const couponStatus = document.getElementById('coupon-status');
  let appliedCoupon = null;

  function renderSummary() {
    const bag = getBag();
    if (bag.length === 0) {
      checkoutForm.querySelector('button[type=submit]').disabled = true;
      itemsEl.innerHTML = `<p class="muted">${S.bagEmpty} — <a href="/shop">${S.discover}</a>.</p>`;
      totalEl.textContent = '$0.00';
      return;
    }
    itemsEl.innerHTML = bag.map(it =>
      `<div class="summary-row"><span>${it.qty} × ${it.name}</span><span>$${(it.qty * it.price).toFixed(2)}</span></div>`
    ).join('');
    if (window.__discount > 0) {
      discountRow.hidden = false;
      discountEl.textContent = `-$${window.__discount.toFixed(2)}`;
    } else {
      discountRow.hidden = true;
    }
    totalEl.textContent = `$${Math.max(0, bagSubtotal(bag) - (window.__discount || 0)).toFixed(2)}`;
  }
  renderSummary();

  if (couponBtn) {
    couponBtn.addEventListener('click', async () => {
      const code = couponInput.value.trim();
      if (!code) return;
      couponStatus.hidden = true;
      try {
        const res = await fetch('/api/coupon/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, subtotal: bagSubtotal(getBag()) }),
        });
        const json = await res.json();
        if (!res.ok) {
          appliedCoupon = null;
          window.__discount = 0;
          couponStatus.textContent = S.couponInvalid;
          couponStatus.className = 'form-error';
          couponStatus.hidden = false;
        } else {
          appliedCoupon = code;
          window.__discount = json.discount;
          couponStatus.textContent = `${S.couponApplied} ${json.description}`;
          couponStatus.className = 'form-success';
          couponStatus.hidden = false;
        }
        renderSummary();
      } catch {
        couponStatus.textContent = S.couponInvalid;
        couponStatus.className = 'form-error';
        couponStatus.hidden = false;
      }
    });
  }

  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('checkout-error');
    errorBox.hidden = true;
    const data = Object.fromEntries(new FormData(checkoutForm).entries());
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          items: getBag(),
          subtotal: bagSubtotal(getBag()),
          discount: window.__discount || 0,
          couponCode: appliedCoupon,
          total: Math.max(0, bagSubtotal(getBag()) - (window.__discount || 0)),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Order failed');
      saveBag([]);
      window.location.href = '/order/' + json.orderNumber;
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.hidden = false;
    }
  });
}

/* ---------------- Contact form ---------------- */
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const okBox = document.getElementById('contact-success');
    const errBox = document.getElementById('contact-error');
    okBox.hidden = true;
    errBox.hidden = true;
    const data = Object.fromEntries(new FormData(contactForm).entries());
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send');
      okBox.hidden = false;
      contactForm.reset();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.hidden = false;
    }
  });
}

/* keep the header counter accurate */
updateBagCount();
