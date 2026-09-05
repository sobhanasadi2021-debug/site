const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const IMG_DIR = path.join(__dirname, '..', 'public', 'images', 'products');
fs.mkdirSync(IMG_DIR, { recursive: true });

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/* ---------- SVG artwork generation (luxury catalogue style) ---------- */

const PALETTES = [
  { bg: '#101014', accent: '#c8a24a', soft: '#2a2a32' },
  { bg: '#17151f', accent: '#b08d57', soft: '#2e2a3a' },
  { bg: '#1a1712', accent: '#d4af37', soft: '#332c22' },
  { bg: '#12181a', accent: '#9fb2a1', soft: '#263030' },
  { bg: '#1b1215', accent: '#c98a8a', soft: '#33232a' },
  { bg: '#141a22', accent: '#8fa8c8', soft: '#232c38' },
];

const SILHOUETTES = {
  tshirt: (c) => `
    <path d="M150 120 L110 135 L85 200 L115 212 L125 175 L125 330 Q200 345 275 330 L275 175 L285 212 L315 200 L290 135 L250 120 Q225 145 200 145 Q175 145 150 120 Z"
      fill="${c.soft}" stroke="${c.accent}" stroke-width="4"/>
    <path d="M150 120 Q200 165 250 120" fill="none" stroke="${c.accent}" stroke-width="4"/>
    <text x="200" y="260" text-anchor="middle" fill="${c.accent}" font-family="Georgia, serif" font-size="26" letter-spacing="6">NOIR</text>`,
  shirt: (c) => `
    <path d="M160 118 L110 138 L88 205 L118 216 L128 180 L128 332 L272 332 L272 180 L282 216 L312 205 L290 138 L240 118 L200 160 Z"
      fill="${c.soft}" stroke="${c.accent}" stroke-width="4"/>
    <path d="M160 118 L200 160 L240 118" fill="none" stroke="${c.accent}" stroke-width="4"/>
    <line x1="200" y1="160" x2="200" y2="330" stroke="${c.accent}" stroke-width="3"/>
    <circle cx="200" cy="200" r="4" fill="${c.accent}"/><circle cx="200" cy="240" r="4" fill="${c.accent}"/>
    <circle cx="200" cy="280" r="4" fill="${c.accent}"/><circle cx="200" cy="315" r="4" fill="${c.accent}"/>`,
  jeans: (c) => `
    <path d="M140 110 L260 110 L268 190 L252 340 L214 340 L204 220 L196 220 L186 340 L148 340 L132 190 Z"
      fill="${c.soft}" stroke="${c.accent}" stroke-width="4"/>
    <rect x="140" y="110" width="120" height="26" fill="${c.bg}" stroke="${c.accent}" stroke-width="3"/>
    <path d="M196 136 L196 220 M204 136 L204 220" stroke="${c.accent}" stroke-width="2.5"/>
    <circle cx="170" cy="160" r="3.5" fill="${c.accent}"/><circle cx="230" cy="160" r="3.5" fill="${c.accent}"/>
    <path d="M148 340 L186 340 M214 340 L252 340" stroke="${c.accent}" stroke-width="5"/>`,
  shoes: (c) => `
    <path d="M80 270 Q90 220 130 205 L175 190 Q205 182 225 205 L250 232 Q290 250 322 262 Q340 270 338 292 L338 310 L72 310 Q68 290 80 270 Z"
      fill="${c.soft}" stroke="${c.accent}" stroke-width="4"/>
    <path d="M72 296 L338 296" stroke="${c.accent}" stroke-width="4"/>
    <path d="M175 190 Q190 225 218 238 M198 197 Q210 228 236 244" fill="none" stroke="${c.accent}" stroke-width="3"/>
    <path d="M250 232 L268 262" stroke="${c.accent}" stroke-width="3"/>`,
  jacket: (c) => `
    <path d="M155 115 L105 140 L85 210 L115 222 L126 185 L126 335 L274 335 L274 185 L285 222 L315 210 L295 140 L245 115 L200 150 Z"
      fill="${c.soft}" stroke="${c.accent}" stroke-width="4"/>
    <path d="M200 150 L180 335 M200 150 L220 335" fill="none" stroke="${c.accent}" stroke-width="3"/>
    <path d="M245 115 Q260 175 250 335 M155 115 Q140 175 150 335" fill="none" stroke="${c.accent}" stroke-width="2.5"/>
    <rect x="150" y="240" width="26" height="40" fill="none" stroke="${c.accent}" stroke-width="3"/>
    <rect x="224" y="240" width="26" height="40" fill="none" stroke="${c.accent}" stroke-width="3"/>`,
  accessory: (c) => `
    <path d="M135 190 L265 190 L285 330 L115 330 Z" fill="${c.soft}" stroke="${c.accent}" stroke-width="4"/>
    <path d="M165 190 Q165 140 200 140 Q235 140 235 190" fill="none" stroke="${c.accent}" stroke-width="5"/>
    <rect x="115" y="245" width="170" height="14" fill="${c.accent}" opacity="0.55"/>
    <circle cx="200" cy="268" r="8" fill="${c.accent}"/>
    <text x="200" y="315" text-anchor="middle" fill="${c.accent}" font-family="Georgia, serif" font-size="18" letter-spacing="5">MAISON</text>`,
};

function makeArtwork(slug, kind, paletteIndex) {
  const c = PALETTES[paletteIndex % PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 440">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c.bg}"/>
      <stop offset="1" stop-color="#050507"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.6">
      <stop offset="0" stop-color="${c.accent}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${c.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="400" height="440" fill="url(#bg)"/>
  <rect width="400" height="440" fill="url(#glow)"/>
  <rect x="14" y="14" width="372" height="412" fill="none" stroke="${c.accent}" stroke-width="1.5" opacity="0.6"/>
  <rect x="22" y="22" width="356" height="396" fill="none" stroke="${c.accent}" stroke-width="0.75" opacity="0.35"/>
  ${SILHOUETTES[kind](c)}
  <path d="M40 396 L60 382 M340 396 L360 382" stroke="${c.accent}" stroke-width="1.5" opacity="0.7"/>
</svg>`;
  const file = path.join(IMG_DIR, `${slug}.svg`);
  fs.writeFileSync(file, svg, 'utf8');
  return `/images/products/${slug}.svg`;
}

/* ---------- catalogue seed ---------- */

const CATALOGUE = [
  ['Signature Noir Tee', 'tshirts', 'tshirt', 89, 'Heavyweight Egyptian cotton tee with tonal gold embroidery and a structured boxy cut.'],
  ['Ivory Silk-Blend Tee', 'tshirts', 'tshirt', 95, 'Breathable silk-blend jersey in warm ivory with mother-of-pearl neck detailing.'],
  ['Atelier Graphic Tee', 'tshirts', 'tshirt', 110, 'Limited-run hand-printed graphic on combed cotton, finished with rolled sleeves.'],
  ['Monogram Crew Tee', 'tshirts', 'tshirt', 105, 'Relaxed crew neck with tonal monogram embroidery across the chest.'],

  ['Milano Dress Shirt', 'shirts', 'shirt', 189, 'Two-ply Italian poplin with a semi-cutaway collar and hand-finished seams.'],
  ['Noir Oxford Shirt', 'shirts', 'shirt', 165, 'Brushed oxford cotton in deep noir, cut slim with genuine horn buttons.'],
  ['Champagne Linen Shirt', 'shirts', 'shirt', 175, 'Washed European linen with a soft collar — effortless from yacht to terrace.'],
  ['Tuxedo Bib Shirt', 'shirts', 'shirt', 240, 'Formal bib-front shirt with French placket, made for black-tie evenings.'],

  ['Heritage Indigo Jeans', 'jeans', 'jeans', 210, 'Selvedge denim woven on vintage shuttle looms, rinsed indigo with chain-stitched hem.'],
  ['Midnight Slim Jeans', 'jeans', 'jeans', 195, 'Deep-black stretch denim with a clean, tailored slim leg.'],
  ['Stone Wash Relaxed Jeans', 'jeans', 'jeans', 185, 'Vintage-inspired stone wash in a relaxed straight fit with antique rivets.'],
  ['Tailored Raw Denim', 'jeans', 'jeans', 230, 'Unwashed 14oz raw denim that fades to your own signature over time.'],

  ['Prestige Leather Sneakers', 'shoes', 'shoes', 420, 'Hand-finished calfskin sneakers with gold-foil edge paint and cushioned insole.'],
  ['Opulence Heels', 'shoes', 'shoes', 480, 'Satin evening pumps with a sculpted 95mm heel and red-carpet silhouette.'],
  ['Regency Chelsea Boots', 'shoes', 'shoes', 465, 'Goodyear-welted Chelsea boots in polished leather with elastic side gussets.'],
  ['Velvet Loafers', 'shoes', 'shoes', 390, 'Smoking loafers in crushed velvet with a gold horsebit buckle.'],

  ['Imperial Wool Coat', 'jackets', 'jacket', 690, 'Double-faced cashmere-wool coat with a sweeping silhouette and hidden placket.'],
  ['Bomber Atelier Jacket', 'jackets', 'jacket', 520, 'Satin bomber with ribbed trims and an embroidered house crest at the back.'],
  ['Voyager Trench', 'jackets', 'jacket', 640, 'Water-repellent cotton gabardine trench with storm shield and horn buckles.'],
  ['Cropped Biker Jacket', 'jackets', 'jacket', 580, 'Butter-soft lambskin biker with asymmetric zip and hand-burnished finish.'],

  ['Sovereign Leather Tote', 'accessories', 'accessory', 720, 'Full-grain leather tote with suede lining and hand-painted edges.'],
  ['Héritage Silk Scarf', 'accessories', 'accessory', 160, 'Twill-woven silk scarf with a hand-rolled hem and archive print.'],
  ['Aurum Belt', 'accessories', 'accessory', 240, 'Italian leather belt with a sculpted gold-tone buckle.'],
  ['Noir Card Holder', 'accessories', 'accessory', 145, 'Slim card holder in saffiano leather with six card slots.'],
];

const products = CATALOGUE.map(([name, category, kind, price, description], i) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    id: i + 1,
    name,
    category,
    price,
    stock: [12, 8, 4, 20, 15, 3, 10, 7, 18, 5, 9, 2, 6, 14, 11, 8, 3, 16, 10, 7, 5, 21, 13, 9][i] || 10,
    description,
    image: makeArtwork(slug, kind, i),
    featured: i % 6 === 0,
    createdAt: new Date().toISOString(),
  };
});

/* ---------- accounts ---------- */

const users = [
  {
    id: 1,
    name: 'Admin',
    email: 'admin@maisonnoir.com',
    password: hashPassword('admin123'),
    role: 'admin',
    wishlist: [],
    address: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Demo Customer',
    email: 'customer@maisonnoir.com',
    password: hashPassword('customer123'),
    role: 'user',
    wishlist: [],
    address: null,
    createdAt: new Date().toISOString(),
  },
];

const settings = {
  storeName: 'MAISON NOIR',
  tagline: 'Luxury Clothing Atelier',
  freeShippingThreshold: 250,
  email: 'concierge@maisonnoir.com',
  phone: '+1 (555) 010-2026',
  addressLine: '12 Rue de la Lumière · Paris · New York · Dubai',
};

const coupons = [
  { id: 1, code: 'WELCOME10', type: 'percent', value: 10, active: true, createdAt: new Date().toISOString() },
];

db.products = products;
db.users = users;
db.orders = [];
db.messages = [];
db.coupons = coupons;
db.settings = settings;

console.log(`Seeded ${products.length} products, ${users.length} accounts, ${coupons.length} coupon.`);
