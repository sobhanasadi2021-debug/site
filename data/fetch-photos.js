// Downloads a real photo for every product from loremflickr (Flickr CC images)
// and points products.json at the downloaded file.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, '..', 'public', 'images', 'products');
const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8'));

// product name -> photo keywords + a lock for a stable image choice
const PHOTO_KEYWORDS = {
  'Signature Noir Tee': ['tshirt'],
  'Ivory Silk-Blend Tee': ['tshirt', 'white'],
  'Atelier Graphic Tee': ['tshirt'],
  'Monogram Crew Tee': ['shirt'],
  'Milano Dress Shirt': ['shirt'],
  'Noir Oxford Shirt': ['shirt', 'man'],
  'Champagne Linen Shirt': ['linen'],
  'Tuxedo Bib Shirt': ['tuxedo'],
  'Heritage Indigo Jeans': ['jeans'],
  'Midnight Slim Jeans': ['jeans'],
  'Stone Wash Relaxed Jeans': ['denim'],
  'Tailored Raw Denim': ['denim'],
  'Prestige Leather Sneakers': ['sneakers'],
  'Opulence Heels': ['heels'],
  'Regency Chelsea Boots': ['boots'],
  'Velvet Loafers': ['shoes'],
  'Imperial Wool Coat': ['coat'],
  'Bomber Atelier Jacket': ['jacket'],
  'Voyager Trench': ['trenchcoat'],
  'Cropped Biker Jacket': ['leather,jacket'],
  'Sovereign Leather Tote': ['handbag'],
  'Héritage Silk Scarf': ['scarf'],
  'Aurum Belt': ['belt'],
  'Noir Card Holder': ['wallet'],
};

let ok = 0, failed = [];
for (const product of products) {
  const slug = product.image.split('/').pop().replace(/\.(svg|jpg|jpeg|png)$/, '');
  const target = path.join(IMG_DIR, `${slug}.jpg`);
  const keywords = PHOTO_KEYWORDS[product.name] || ['clothes'];
  const url = `https://loremflickr.com/900/1100/${keywords.join(',')}?lock=${product.id * 37}`;
  try {
    execFileSync('curl', ['-s', '-f', '-L', '--max-time', '40', '-o', target, url]);
    const head = fs.readFileSync(target).subarray(0, 4).toString('hex');
    const isJpeg = head.startsWith('ffd8');
    const size = fs.statSync(target).size;
    if (!isJpeg || size < 5000) throw new Error(`bad image (${size} bytes)`);
    product.image = `/images/products/${slug}.jpg`;
    ok++;
    console.log(`ok   ${product.name}  (${size} bytes)`);
  } catch (err) {
    failed.push(product.name);
    if (fs.existsSync(target)) fs.unlinkSync(target);
    console.log(`FAIL ${product.name}: ${err.message} — keeping SVG`);
  }
}

fs.writeFileSync(path.join(__dirname, 'products.json'), JSON.stringify(products, null, 2));
console.log(`\n${ok} products now use photos, ${failed.length} kept SVG artwork.`);
