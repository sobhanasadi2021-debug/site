// Fetches curated Unsplash product photography via the wsrv.nl image proxy
// (images.unsplash.com is not directly reachable from this machine).
// Each product has fallback photo IDs; the first that downloads wins.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, '..', 'public', 'images', 'products');

const PHOTOS = {
  'signature-noir-tee':    ['1576566588028-4147f3842f27', '1618354691373-d851c5c3a990', '1521572163474-6864f9cf17ab'],
  'ivory-silk-blend-tee':  ['1521572163474-6864f9cf17ab', '1620799140408-edc6dcb6d633', '1618354691373-d851c5c3a990'],
  'atelier-graphic-tee':   ['1523381210434-271e8be1f52b', '1618354691373-d851c5c3a990', '1521572163474-6864f9cf17ab'],
  'monogram-crew-tee':     ['1620799140408-edc6dcb6d633', '1521572163474-6864f9cf17ab', '1523381210434-271e8be1f52b'],

  'milano-dress-shirt':    ['1596755094514-f87e34085b2c', '1562157873-818bc0726f68', '1598033129183-c4f50c736f10'],
  'noir-oxford-shirt':     ['1598033129183-c4f50c736f10', '1562157873-818bc0726f68', '1596755094514-f87e34085b2c'],
  'champagne-linen-shirt': ['1562157873-818bc0726f68', '1596755094514-f87e34085b2c', '1598033129183-c4f50c736f10'],
  'tuxedo-bib-shirt':      ['1594938298603-c8148c4dae35', '1598033129183-c4f50c736f10', '1596755094514-f87e34085b2c'],

  'heritage-indigo-jeans': ['1542272604-787c3835535d', '1541099649105-f69ad21f3246', '1584370848010-d7fe6bc767ec'],
  'midnight-slim-jeans':   ['1541099649105-f69ad21f3246', '1542272604-787c3835535d', '1565084888279-aca607ecce0c'],
  'stone-wash-relaxed-jeans': ['1565084888279-aca607ecce0c', '1542272604-787c3835535d', '1541099649105-f69ad21f3246'],
  'tailored-raw-denim':    ['1584370848010-d7fe6bc767ec', '1542272604-787c3835535d', '1475178626620-a4d074967452'],

  'prestige-leather-sneakers': ['1560343090-f0409e92791a', '1549298916-b41d501d3772', '1595950653106-6c9ebd614d3a'],
  'opulence-heels':        ['1520639888713-7851133b1ed0', '1533867617858-e7b97e060509', '1543163521-1bf539c55dd2'],
  'regency-chelsea-boots': ['1608256246200-53e635b5b65f', '1638247025967-b4e38f787b76', '1543163521-1bf539c55dd2'],
  'velvet-loafers':        ['1533867617858-e7b97e060509', '1543163521-1bf539c55dd2', '1520639888713-7851133b1ed0'],

  'imperial-wool-coat':    ['1434389677669-e08b4cac3105', '1544022613-e87ca75a784a', '1537154799883-681c0aa29bb5'],
  'bomber-atelier-jacket': ['1591047139829-d91aecb6caea', '1551028719-00167b16eac5', '1520975954732-35dd22299614'],
  'voyager-trench':        ['1537154799883-681c0aa29bb5', '1544022613-e87ca75a784a', '1434389677669-e08b4cac3105'],
  'cropped-biker-jacket':  ['1551028719-00167b16eac5', '1525507119028-ed4c629a60a3', '1591047139829-d91aecb6caea'],

  'sovereign-leather-tote': ['1548036328-c9fa89d128fa', '1584917865442-de89df76afd3', '1553062407-98eeb64c6a62'],
  'h-ritage-silk-scarf':   ['1601924994987-69e26d50dc26', '1457545195570-67f207084966', '1544441893-675973e31985'],
  'aurum-belt':            ['1624222247344-550fb60583dc', '1547949003-9792a18a2601', '1627123424574-724758594e93'],
  'noir-card-holder':      ['1627123424574-724758594e93', '1553062407-98eeb64c6a62', '1548036328-c9fa89d128fa'],
};

function fetchPhoto(id, target) {
  const proxied = `https://wsrv.nl/?url=${encodeURIComponent(`images.unsplash.com/photo-${id}?w=900&q=80&fit=crop&crop=entropy`)}&w=900`;
  execFileSync('curl', ['-s', '-f', '-L', '--max-time', '45', '-o', target, proxied]);
  const head = fs.readFileSync(target).subarray(0, 3).toString('hex');
  const size = fs.statSync(target).size;
  if (head !== 'ffd8ff' || size < 8000) throw new Error(`bad payload (${size} bytes)`);
}

const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8'));
let ok = 0;
const failed = [];

for (const product of products) {
  const slug = product.image.split('/').pop().replace(/\.(svg|jpg)$/, '');
  const target = path.join(IMG_DIR, `${slug}.jpg`);
  const candidates = PHOTOS[slug] || [];
  let done = false;
  for (const id of candidates) {
    try {
      fetchPhoto(id, target);
      product.image = `/images/products/${slug}.jpg`;
      ok++;
      console.log(`ok   ${slug}  <- photo-${id} (${fs.statSync(target).size} bytes)`);
      done = true;
      break;
    } catch (err) {
      if (fs.existsSync(target)) fs.unlinkSync(target);
    }
  }
  if (!done) {
    failed.push(slug);
    console.log(`FAIL ${slug} — all candidates failed`);
  }
}

fs.writeFileSync(path.join(__dirname, 'products.json'), JSON.stringify(products, null, 2));

// report duplicates
const hashes = {};
for (const f of fs.readdirSync(IMG_DIR).filter(f => f.endsWith('.jpg'))) {
  const h = execFileSync('md5sum', [path.join(IMG_DIR, f)]).toString().split(' ')[0];
  (hashes[h] = hashes[h] || []).push(f);
}
const dups = Object.values(hashes).filter(v => v.length > 1);
console.log(`\n${ok} products updated with photos, ${failed.length} failed, ${dups.length} duplicate group(s).`);
if (failed.length) console.log('failed:', failed.join(', '));
