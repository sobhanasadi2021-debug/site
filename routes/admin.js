const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../data/db');

const { app, requireAdmin } = require('./pages');

/* ---------- image upload ---------- */

const uploadDir = path.join(__dirname, '..', 'public', 'images', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `product-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(path.extname(file.originalname || '').toLowerCase());
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  },
});

/* ---------- product CRUD (admin) ---------- */

function parseProductBody(body) {
  const { name, category, price, description, imageUrl, stock } = body;
  const errors = [];
  if (!name || !String(name).trim()) errors.push('Name is required.');
  if (!category) errors.push('Category is required.');
  const priceNum = Number(price);
  if (!price || Number.isNaN(priceNum) || priceNum <= 0) errors.push('A valid price is required.');
  const stockNum = parseInt(stock, 10);
  return { errors, values: { name: String(name).trim(), category, price: priceNum, description: String(description || '').trim(), imageUrl: String(imageUrl || '').trim(), stock: Number.isNaN(stockNum) ? 0 : Math.max(0, stockNum) } };
}

app.post('/admin/products', requireAdmin, upload.single('image'), (req, res) => {
  const { errors, values } = parseProductBody(req.body);
  const image = req.file ? `/images/uploads/${req.file.filename}` : values.imageUrl;
  if (!image) errors.push('Please upload an image or provide an image URL.');
  if (errors.length) return res.status(400).render('admin/product-form', { title: 'Add Product — Maison Noir', product: null, errors, values });

  const products = db.products;
  const product = {
    id: db.nextId(products),
    name: values.name,
    category: values.category,
    price: values.price,
    stock: values.stock,
    description: values.description,
    image,
    featured: req.body.featured === 'on',
    createdAt: new Date().toISOString(),
  };
  products.push(product);
  db.products = products;
  res.redirect('/admin/products');
});

app.post('/admin/products/:id', requireAdmin, upload.single('image'), (req, res) => {
  const products = db.products;
  const product = products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).render('error', { title: 'Not Found', message: 'Product not found.' });
  const { errors, values } = parseProductBody(req.body);
  const image = req.file ? `/images/uploads/${req.file.filename}` : (values.imageUrl || product.image);
  if (errors.length) return res.status(400).render('admin/product-form', { title: 'Edit Product — Maison Noir', product, errors, values });

  Object.assign(product, {
    name: values.name,
    category: values.category,
    price: values.price,
    stock: values.stock,
    description: values.description,
    image,
    featured: req.body.featured === 'on',
  });
  db.products = products;
  res.redirect('/admin/products');
});

app.post('/admin/products/:id/delete', requireAdmin, (req, res) => {
  db.products = db.products.filter(p => p.id !== Number(req.params.id));
  // also drop it from every wishlist
  const users = db.users.map(u => ({ ...u, wishlist: (u.wishlist || []).filter(id => id !== Number(req.params.id)) }));
  db.users = users;
  res.redirect('/admin/products');
});

/* ---------- stock quick-adjust ---------- */
app.post('/admin/products/:id/stock', requireAdmin, (req, res) => {
  const products = db.products;
  const product = products.find(p => p.id === Number(req.params.id));
  const stock = parseInt(req.body.stock, 10);
  if (product && !Number.isNaN(stock) && stock >= 0) {
    product.stock = stock;
    db.products = products;
  }
  res.redirect('/admin/products');
});

/* ---------- orders ---------- */

app.post('/admin/orders/:id/status', requireAdmin, (req, res) => {
  const orders = db.orders;
  const order = orders.find(o => o.id === Number(req.params.id));
  if (order) {
    order.status = req.body.status;
    db.orders = orders;
  }
  res.redirect('/admin/orders');
});

app.post('/admin/orders/:id/delete', requireAdmin, (req, res) => {
  db.orders = db.orders.filter(o => o.id !== Number(req.params.id));
  res.redirect('/admin/orders');
});

/* ---------- users ---------- */

app.post('/admin/users/:id/delete', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.session.user.id) return res.redirect('/admin/users');
  db.users = db.users.filter(u => u.id !== id);
  res.redirect('/admin/users');
});

app.post('/admin/users/:id/role', requireAdmin, (req, res) => {
  const users = db.users;
  const user = users.find(u => u.id === Number(req.params.id));
  if (user && req.session.user.id !== user.id) {
    user.role = req.body.role === 'admin' ? 'admin' : 'user';
    db.users = users;
  }
  res.redirect('/admin/users');
});

/* ---------- messages ---------- */

app.post('/admin/messages/:id/read', requireAdmin, (req, res) => {
  const messages = db.messages;
  const m = messages.find(x => x.id === Number(req.params.id));
  if (m) { m.read = req.body.read === '1'; db.messages = messages; }
  res.redirect('/admin/messages');
});

app.post('/admin/messages/:id/delete', requireAdmin, (req, res) => {
  db.messages = db.messages.filter(m => m.id !== Number(req.params.id));
  res.redirect('/admin/messages');
});

/* ---------- coupons ---------- */

app.post('/admin/coupons', requireAdmin, (req, res) => {
  const { code, type, value } = req.body;
  const coupons = db.coupons || [];
  const valueNum = Number(value);
  if (!code || !String(code).trim() || Number.isNaN(valueNum) || valueNum <= 0 || !['percent', 'fixed'].includes(type)) {
    return res.redirect('/admin/coupons');
  }
  coupons.push({
    id: db.nextId(coupons),
    code: String(code).trim().toUpperCase(),
    type,
    value: type === 'percent' ? Math.min(100, valueNum) : valueNum,
    active: true,
    createdAt: new Date().toISOString(),
  });
  db.coupons = coupons;
  res.redirect('/admin/coupons');
});

app.post('/admin/coupons/:id/toggle', requireAdmin, (req, res) => {
  const coupons = db.coupons || [];
  const c = coupons.find(x => x.id === Number(req.params.id));
  if (c) { c.active = !c.active; db.coupons = coupons; }
  res.redirect('/admin/coupons');
});

app.post('/admin/coupons/:id/delete', requireAdmin, (req, res) => {
  db.coupons = (db.coupons || []).filter(c => c.id !== Number(req.params.id));
  res.redirect('/admin/coupons');
});

/* ---------- boutique settings ---------- */

app.post('/admin/settings', requireAdmin, (req, res) => {
  const { storeName, tagline, freeShippingThreshold, email, phone, addressLine } = req.body;
  db.settings = {
    storeName: String(storeName || '').trim() || 'MAISON NOIR',
    tagline: String(tagline || '').trim(),
    freeShippingThreshold: Math.max(0, Number(freeShippingThreshold) || 0),
    email: String(email || '').trim(),
    phone: String(phone || '').trim(),
    addressLine: String(addressLine || '').trim(),
  };
  res.redirect('/admin/settings?saved=1');
});
