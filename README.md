# Maison Noir — Luxury Clothing Boutique

A complete e-commerce website for a luxury clothing shop, built with Node.js + Express + EJS. Dark noir design with gold accents, 24 seeded products (each with generated artwork), a homepage hero slider, shopping bag, checkout, user accounts and a full admin panel.

## Run

```bash
npm install
npm start          # opens on http://localhost:3000
```

To reset the catalogue / accounts back to the seed data (re-downloads the product photos too):

```bash
npm run seed
```

Product photos are real stock photos (Unsplash) fetched through the wsrv.nl image proxy via `data/fetch-unsplash.js` — each product has fallback photo IDs, and downloads are verified to be unique JPEGs.

## Demo accounts

| Role     | Email                    | Password    |
|----------|--------------------------|-------------|
| Admin    | admin@maisonnoir.com     | admin123    |
| Customer | customer@maisonnoir.com  | customer123 |

## Pages (20+)

**Storefront:** Home (hero slider, category tiles, featured & new pieces), Shop (search / sort / filter), 6 category pages (T-Shirts, Shirts, Jeans, Shoes, Jackets & Coats, Accessories), Product detail, Shopping bag (localStorage), Checkout, Order confirmation, Sign in, Register, My Account (order history), The Maison (about), Contact (saves messages to admin), Client Care (FAQ).

**Admin panel** (`/admin`, admins only): Dashboard (revenue/orders/users stats), Products (list), Add / Edit product form — with image upload (jpg/png/webp/gif/svg, max 5 MB) or image URL, price, category, description and "featured" flag, Orders (status workflow: pending → processing → shipped → delivered / cancelled), Users (role management, delete), Messages (client contact inbox).

## Structure

```
server.js            entry point
routes/pages.js      storefront + auth + order routes
routes/admin.js      admin product/order/user CRUD (multer image upload)
data/db.js           JSON file data layer (data/*.json)
data/seed.js         seeds products + accounts, generates product SVG art
data/make-banners.js generates the 3 hero slider banners
views/               EJS templates (partials, storefront, admin)
public/css/style.css luxury theme
public/js/main.js    slider, bag, checkout, contact logic
```

Data is stored as JSON files in `data/` — no database needed. Passwords are salted + hashed with scrypt. Sessions use express-session.
"# site" 
