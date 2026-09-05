const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const db = require('../data/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'maison-noir-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
}));

/* ---------- i18n ---------- */
const LOCALES = { en: require('../locales/en'), fa: require('../locales/fa') };

function getSettings() {
  return db.settings || {
    storeName: 'MAISON NOIR', tagline: 'Luxury Clothing Atelier',
    freeShippingThreshold: 250, email: 'concierge@maisonnoir.com',
    phone: '+1 (555) 010-2026', addressLine: '12 Rue de la Lumière · Paris · New York · Dubai',
  };
}

app.use((req, res, next) => {
  const lang = req.session.lang && LOCALES[req.session.lang] ? req.session.lang : 'en';
  const t = LOCALES[lang];
  res.locals.lang = lang;
  res.locals.dir = t.dir;
  res.locals.t = t;
  res.locals.user = req.session.user || null;
  res.locals.path = req.path;
  res.locals.settings = getSettings();
  res.locals.price = (n) => `$${Number(n).toFixed(2)}`;
  res.locals.dateFmt = (d) => new Date(d).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US');
  next();
});

app.get('/lang/:code', (req, res) => {
  const code = req.params.code;
  if (LOCALES[code]) req.session.lang = code;
  res.redirect(req.get('Referer') || '/');
});

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  if (req.session.user.role !== 'admin') return res.status(403).render('error', { title: 'Forbidden', message: 'Admins only.' });
  next();
}

/* ============================= CATALOGUE ============================= */

const CATEGORIES = [
  { slug: 'tshirts', name: 'T-Shirts', name_fa: 'تی‌شرت' },
  { slug: 'shirts', name: 'Shirts', name_fa: 'پیراهن' },
  { slug: 'jeans', name: 'Jeans', name_fa: 'شلوار جین' },
  { slug: 'shoes', name: 'Shoes', name_fa: 'کفش' },
  { slug: 'jackets', name: 'Jackets & Coats', name_fa: 'کت و پالتو' },
  { slug: 'accessories', name: 'Accessories', name_fa: 'اکسسوری' },
];
app.locals.categories = CATEGORIES;

const catName = (lang) => (cat) => (lang === 'fa' ? cat.name_fa : cat.name);

/* ============================= PAGES ============================= */

app.get('/', (req, res) => {
  const products = db.products;
  const t = res.locals.t;
  res.render('home', {
    title: 'Maison Noir — Luxury Clothing Atelier',
    featured: products.filter(p => p.featured).slice(0, 4),
    latest: products.slice(-4).reverse(),
    slider: t.slider.map((s, i) => ({ ...s, image: `/images/slider-${i + 1}.jpg` })),
    catLocalized: catName(res.locals.lang),
  });
});

function renderShop(req, res, presetCategory) {
  const lang = res.locals.lang;
  const category = presetCategory || req.query.category || 'all';
  const q = (req.query.q || '').trim().toLowerCase();
  const sort = req.query.sort || 'featured';
  let products = db.products;
  if (category !== 'all') products = products.filter(p => p.category === category);
  if (q) products = products.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  if (sort === 'price-asc') products = [...products].sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') products = [...products].sort((a, b) => b.price - a.price);
  if (sort === 'name') products = [...products].sort((a, b) => a.name.localeCompare(b.name));
  const activeCat = CATEGORIES.find(c => c.slug === category);
  const heading = activeCat ? catName(lang)(activeCat) : (lang === 'fa' ? 'کالکشن' : 'The Collection');
  res.render('shop', {
    title: heading + ' — Maison Noir',
    products, category, q, sort, heading,
    catLocalized: catName(lang),
  });
}

app.get('/shop', (req, res) => renderShop(req, res));
CATEGORIES.forEach(cat => app.get('/category/' + cat.slug, (req, res) => renderShop(req, res, cat.slug)));

app.get('/product/:id', (req, res) => {
  const product = db.products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).render('error', { title: 'Not Found', message: res.locals.t.no_longer });
  const related = db.products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
  const wishlisted = !!(req.session.user && (db.users.find(u => u.id === req.session.user.id)?.wishlist || []).includes(product.id));
  res.render('product', { title: product.name + ' — Maison Noir', product, related, wishlisted, catLocalized: catName(res.locals.lang) });
});

app.get('/about', (req, res) => res.render('about', { title: res.locals.t.maison_title + ' — Maison Noir' }));
app.get('/contact', (req, res) => res.render('contact', { title: res.locals.t.contact_title + ' — Maison Noir' }));
app.get('/faq', (req, res) => res.render('faq', { title: res.locals.t.faq_title + ' — Maison Noir' }));

app.get('/login', (req, res) => res.render('login', { title: res.locals.t.sign_in + ' — Maison Noir', error: null, next: req.query.next || '/' }));
app.get('/register', (req, res) => res.render('register', { title: res.locals.t.create_account_link + ' — Maison Noir', error: null }));

/* ============================= USER ACCOUNT ============================= */

app.get('/account', requireLogin, (req, res) => {
  const user = db.users.find(u => u.id === req.session.user.id);
  const tab = ['orders', 'profile', 'address', 'wishlist'].includes(req.query.tab) ? req.query.tab : 'orders';
  const orders = db.orders.filter(o => o.email === user.email).reverse();
  const wishlist = (user.wishlist || []).map(id => db.products.find(p => p.id === id)).filter(Boolean);
  res.render('account', {
    title: res.locals.t.my_account + ' — Maison Noir', orders, tab, wishlist,
    addressData: user.address || null,
    flash: req.session.flash || null,
  });
  delete req.session.flash;
});

app.post('/profile', requireLogin, (req, res) => {
  const users = db.users;
  const user = users.find(u => u.id === req.session.user.id);
  const { name, currentPassword, newPassword } = req.body;
  if (name && String(name).trim()) user.name = String(name).trim();
  if (newPassword) {
    if (!verifyPassword(currentPassword || '', user.password)) {
      req.session.flash = { type: 'error', text: 'Current password is incorrect.' };
      return res.redirect('/account?tab=profile');
    }
    if (String(newPassword).length < 6) {
      req.session.flash = { type: 'error', text: 'New password must be at least 6 characters.' };
      return res.redirect('/account?tab=profile');
    }
    user.password = hashPassword(String(newPassword));
  }
  db.users = users;
  req.session.user.name = user.name;
  req.session.flash = { type: 'success', text: res.locals.t.saved_details };
  res.redirect('/account?tab=profile');
});

app.post('/profile/address', requireLogin, (req, res) => {
  const users = db.users;
  const user = users.find(u => u.id === req.session.user.id);
  const { address, city, zip, country } = req.body;
  user.address = { address: String(address || '').trim(), city: String(city || '').trim(), zip: String(zip || '').trim(), country: String(country || '').trim() };
  db.users = users;
  req.session.flash = { type: 'success', text: res.locals.t.address_saved };
  res.redirect('/account?tab=address');
});

app.post('/account/orders/:id/cancel', requireLogin, (req, res) => {
  const orders = db.orders;
  const order = orders.find(o => o.id === Number(req.params.id));
  if (order && order.email === req.session.user.email && order.status === 'pending') {
    order.status = 'cancelled';
    db.orders = orders;
  }
  res.redirect('/account?tab=orders');
});

/* wishlist */
app.post('/api/wishlist/toggle', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'login' });
  const users = db.users;
  const user = users.find(u => u.id === req.session.user.id);
  const productId = Number(req.body.productId);
  user.wishlist = user.wishlist || [];
  const idx = user.wishlist.indexOf(productId);
  if (idx >= 0) { user.wishlist.splice(idx, 1); added = false; }
  else { user.wishlist.push(productId); added = true; }
  db.users = users;
  res.json({ ok: true, added });
});

/* ============================= AUTH ============================= */

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email.toLowerCase() === String(email || '').toLowerCase());
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).render('login', { title: res.locals.t.sign_in + ' — Maison Noir', error: res.locals.lang === 'fa' ? 'ایمیل یا رمز عبور اشتباه است.' : 'Invalid email or password.', next: req.body.next || '/' });
  }
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.redirect(req.body.next && req.body.next.startsWith('/') ? req.body.next : '/');
});

app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  const users = db.users;
  const bad = res.locals.lang === 'fa';
  if (!name || !email || !password) {
    return res.status(400).render('register', { title: res.locals.t.create_account_link + ' — Maison Noir', error: bad ? 'همه فیلدها الزامی هستند.' : 'All fields are required.' });
  }
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).render('register', { title: res.locals.t.create_account_link + ' — Maison Noir', error: bad ? 'حسابی با این ایمیل وجود دارد.' : 'An account with this email already exists.' });
  }
  const user = {
    id: db.nextId(users), name, email,
    password: hashPassword(password), role: 'user',
    wishlist: [], address: null,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  db.users = users;
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.redirect('/account');
});

app.post('/logout', (req, res) => { req.session.destroy(() => res.redirect('/')); });

/* ============================= ORDERS / CHECKOUT ============================= */

app.get('/cart', (req, res) => res.render('cart', { title: res.locals.t.bag + ' — Maison Noir' }));
app.get('/checkout', (req, res) => {
  if (!req.session.user) return res.redirect('/login?next=%2Fcheckout');
  const user = db.users.find(u => u.id === req.session.user.id);
  res.render('checkout', { title: res.locals.t.checkout_title + ' — Maison Noir', savedAddress: user.address || null });
});

app.post('/api/orders', (req, res) => {
  const { items, total, subtotal, discount, couponCode, name, email, address, city, zip, country } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Your bag is empty.' });
  const orders = db.orders;
  const order = {
    id: db.nextId(orders),
    number: 'MN-' + String(1000 + db.nextId(orders)),
    userId: req.session.user ? req.session.user.id : null,
    name, email: email || (req.session.user && req.session.user.email), address, city, zip, country,
    items, subtotal: Number(subtotal || total), discount: Number(discount || 0),
    couponCode: couponCode || null, total: Number(total),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  db.orders = orders;
  res.json({ ok: true, orderNumber: order.number });
});

// validate a discount code against a subtotal
app.post('/api/coupon/validate', (req, res) => {
  const { code, subtotal } = req.body;
  const coupons = db.coupons || [];
  const coupon = coupons.find(c => c.code.toLowerCase() === String(code || '').toLowerCase() && c.active);
  if (!coupon) return res.status(404).json({ error: 'invalid' });
  const discount = coupon.type === 'percent'
    ? Number(subtotal) * coupon.value / 100
    : Math.min(coupon.value, Number(subtotal));
  res.json({ ok: true, discount: Number(discount.toFixed(2)), description: coupon.type === 'percent' ? `-${coupon.value}%` : `-$${coupon.value}` });
});

app.get('/order/:number', (req, res) => {
  const order = db.orders.find(o => o.number === req.params.number);
  if (!order) return res.status(404).render('error', { title: 'Not Found', message: 'Order not found.' });
  res.render('order-success', { title: res.locals.t.order_confirmed + ' — Maison Noir', order });
});

app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'All fields are required.' });
  const messages = db.messages;
  messages.push({ id: db.nextId(messages), name, email, message, read: false, createdAt: new Date().toISOString() });
  db.messages = messages;
  res.json({ ok: true });
});

/* ============================= ADMIN ============================= */

app.get('/admin', requireAdmin, (req, res) => {
  const orders = db.orders, products = db.products, users = db.users, messages = db.messages, coupons = db.coupons || [];
  const revenue = orders.reduce((s, o) => s + (o.status !== 'cancelled' ? Number(o.total) : 0), 0);
  const aov = orders.length ? revenue / orders.filter(o => o.status !== 'cancelled').length : 0;

  // revenue for the last 14 days
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const dayRevenue = orders.filter(o => { const c = new Date(o.createdAt); return c >= d && c < next && o.status !== 'cancelled'; })
      .reduce((s, o) => s + Number(o.total), 0);
    days.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue: dayRevenue });
  }
  const maxRevenue = Math.max(...days.map(d => d.revenue), 1);

  // revenue per category
  const catRevenue = CATEGORIES.map(c => {
    const rev = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.items.reduce((si, it) => {
      const prod = products.find(p => p.id === Number(it.id));
      return si + (prod && prod.category === c.slug ? Number(it.price) * it.qty : 0);
    }, 0), 0);
    return { name: c.name, revenue: rev };
  }).sort((a, b) => b.revenue - a.revenue);

  const lowStock = products.filter(p => Number(p.stock || 0) <= 5).sort((a, b) => (a.stock || 0) - (b.stock || 0));

  res.render('admin/dashboard', {
    title: 'Admin Dashboard — Maison Noir',
    stats: {
      revenue, aov, orders: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      products: products.length,
      lowStock: lowStock.length,
      users: users.length,
      messages: messages.filter(m => !m.read).length,
      coupons: coupons.filter(c => c.active).length,
    },
    chartDays: days, maxRevenue, catRevenue,
    lowStock: lowStock.slice(0, 6),
    recentOrders: [...orders].reverse().slice(0, 8),
  });
});

app.get('/admin/products', requireAdmin, (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  const category = req.query.category || 'all';
  const featured = req.query.featured || 'all';
  let products = db.products;
  if (q) products = products.filter(p => p.name.toLowerCase().includes(q));
  if (category !== 'all') products = products.filter(p => p.category === category);
  if (featured !== 'all') products = products.filter(p => (featured === 'yes') === !!p.featured);
  res.render('admin/products', { title: 'Manage Products — Maison Noir', products, q, category, featured });
});

app.get('/admin/products/new', requireAdmin, (req, res) => {
  res.render('admin/product-form', { title: 'Add Product — Maison Noir', product: null });
});

app.get('/admin/products/:id/edit', requireAdmin, (req, res) => {
  const product = db.products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).render('error', { title: 'Not Found', message: 'Product not found.' });
  res.render('admin/product-form', { title: 'Edit Product — Maison Noir', product });
});

app.get('/admin/orders', requireAdmin, (req, res) => {
  const status = req.query.status || 'all';
  const q = (req.query.q || '').trim().toLowerCase();
  let orders = [...db.orders].reverse();
  if (status !== 'all') orders = orders.filter(o => o.status === status);
  if (q) orders = orders.filter(o => o.number.toLowerCase().includes(q) || (o.name || '').toLowerCase().includes(q) || (o.email || '').toLowerCase().includes(q));
  res.render('admin/orders', { title: 'Manage Orders — Maison Noir', orders, status, q });
});

app.get('/admin/users', requireAdmin, (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  const role = req.query.role || 'all';
  let users = db.users;
  if (q) users = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  if (role !== 'all') users = users.filter(u => u.role === role);
  users = users.map(u => {
    const { password, ...safe } = u;
    return { ...safe, orders: db.orders.filter(o => o.userId === u.id || o.email === u.email).length };
  });
  res.render('admin/users', { title: 'Manage Users — Maison Noir', users, q, role });
});

app.get('/admin/messages', requireAdmin, (req, res) => {
  res.render('admin/messages', { title: 'Client Messages — Maison Noir', messages: [...db.messages].reverse() });
});

app.get('/admin/coupons', requireAdmin, (req, res) => {
  res.render('admin/coupons', { title: 'Discount Codes — Maison Noir', coupons: db.coupons || [] });
});

app.get('/admin/settings', requireAdmin, (req, res) => {
  res.render('admin/settings', { title: 'Boutique Settings — Maison Noir', saved: req.query.saved === '1' });
});

module.exports = { app, requireAdmin, requireLogin, hashPassword, getSettings, verifyPassword };
