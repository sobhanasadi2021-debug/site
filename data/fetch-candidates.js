// Fetches numbered candidates for products whose photos were a poor match,
// so the best one can be picked visually.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, '..', 'public', 'images', 'products');
const CAND = path.join(IMG_DIR, 'candidates');
fs.mkdirSync(CAND, { recursive: true });

const CANDIDATES = {
  'signature-noir-tee': ['1618354691373-d851c5c3a990', '1583743814966-8936f5b7be1a', '1622445275576-721325763afe'],
  'milano-dress-shirt': ['1620012253295-c15cc3e65df4', '1602810318383-e386cc2a3ccf', '1598743101130-1d4b84420d25'],
  'champagne-linen-shirt': ['1589310243388-0e268104d454', '1620012253295-c15cc3e65df4', '1692827387174-aaaac6f202f6'],
  'opulence-heels': ['1543163521-1bf539c55dd2', '1596703263926-eb0762ee17e4', '1531310197839-ccf54634509e', '1515372039744-b8f02a3ae446'],
  'prestige-leather-sneakers': ['1600185365483-26d7a4cc7519', '1606107557195-0e29a4b5b4aa', '1595950653106-6c9ebd614d3a', '1608231387042-66d1773070a5'],
  'imperial-wool-coat': ['1537154799883-681c0aa29bb5', '1520975954732-35dd22299614', '1544966503-7cc5ac882d5f', '1548624313-0396c75e4b1a'],
  'h-ritage-silk-scarf': ['1457545195570-67f207084966', '1520903920243-00d872a2d1c9', '1544441893-675973e31985', '1611601322175-ef8ec8c85f01'],
};

for (const [slug, ids] of Object.entries(CANDIDATES)) {
  ids.forEach((id, i) => {
    const target = path.join(CAND, `${slug}-${i + 1}.jpg`);
    const proxied = `https://wsrv.nl/?url=${encodeURIComponent(`images.unsplash.com/photo-${id}?w=900&q=80&fit=crop&crop=entropy`)}&w=900`;
    try {
      execFileSync('curl', ['-s', '-f', '-L', '--max-time', '45', '-o', target, proxied]);
      const head = fs.readFileSync(target).subarray(0, 3).toString('hex');
      const size = fs.statSync(target).size;
      if (head !== 'ffd8ff' || size < 8000) throw new Error('bad');
      console.log(`ok   ${slug}-${i + 1}  (${size} bytes)`);
    } catch {
      if (fs.existsSync(target)) fs.unlinkSync(target);
      console.log(`FAIL ${slug}-${i + 1}`);
    }
  });
}
