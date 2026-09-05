// Fetches editorial fashion photos for the hero slider via the wsrv.nl proxy.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'images');

const BANNERS = {
  'slider-1': ['1483985988355-763728e1935b', '1490481651871-ab68de25d43d', '1509631179647-0177331693ae'],
  'slider-2': ['1441984904996-e0b6ba687e04', '1512436991641-6745cdb1723f', '1445205170230-053b83016050'],
  'slider-3': ['1524504388940-b1c1722653e1', '1487222477894-8943e31ef7b2', '1490481651871-ab68de25d43d'],
};

for (const [name, ids] of Object.entries(BANNERS)) {
  let done = false;
  for (const id of ids) {
    const target = path.join(DIR, `${name}.jpg`);
    const proxied = `https://wsrv.nl/?url=${encodeURIComponent(`images.unsplash.com/photo-${id}?w=1800&q=80&fit=crop&crop=entropy`)}&w=1800`;
    try {
      execFileSync('curl', ['-s', '-f', '-L', '--max-time', '60', '-o', target, proxied]);
      const head = fs.readFileSync(target).subarray(0, 3).toString('hex');
      const size = fs.statSync(target).size;
      if (head !== 'ffd8ff' || size < 20000) throw new Error('bad');
      console.log(`ok   ${name}.jpg <- photo-${id} (${size} bytes)`);
      done = true;
      break;
    } catch {
      if (fs.existsSync(target)) fs.unlinkSync(target);
    }
  }
  if (!done) console.log(`FAIL ${name} — keeping SVG banner`);
}
