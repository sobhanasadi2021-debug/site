// Generates the three homepage hero banners as SVG files.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'images');
fs.mkdirSync(DIR, { recursive: true });

function banner({ c1, c2, accent, lines, kind }) {
  let art = '';
  if (kind === 'coat') {
    art = `<path d="M480 120 L400 160 L360 290 L410 308 L428 250 L428 560 L672 560 L672 250 L690 308 L740 290 L700 160 L620 120 L550 175 Z"
      fill="none" stroke="${accent}" stroke-width="5"/>
      <path d="M550 175 L520 560 M550 175 L580 560" stroke="${accent}" stroke-width="3.5" fill="none"/>`;
  } else if (kind === 'jeans') {
    art = `<path d="M470 110 L630 110 L642 230 L618 560 L545 560 L552 300 L548 300 L532 560 L462 560 L440 230 Z"
      fill="none" stroke="${accent}" stroke-width="5"/>
      <rect x="470" y="110" width="160" height="30" fill="none" stroke="${accent}" stroke-width="4"/>`;
  } else {
    art = `<path d="M300 460 Q320 370 400 340 L470 315 Q520 300 555 335 L600 385 Q680 420 760 445 Q795 460 790 500 L790 535 L310 535 Q295 500 300 460 Z"
      fill="none" stroke="${accent}" stroke-width="5"/>
      <path d="M310 515 L790 515" stroke="${accent}" stroke-width="4"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 640" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="r" cx="0.72" cy="0.5" r="0.55">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1440" height="640" fill="url(#g)"/>
  <rect width="1440" height="640" fill="url(#r)"/>
  <g opacity="0.9" transform="translate(620,20)">${art}</g>
  <rect x="40" y="40" width="1360" height="560" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.5"/>
  <path d="M120 120 h90 M120 120 v60 M1320 520 h-90 M1320 520 v-60" stroke="${accent}" stroke-width="2" opacity="0.8"/>
</svg>`;
}

fs.writeFileSync(path.join(DIR, 'slider-1.svg'), banner({
  c1: '#101014', c2: '#050507', accent: '#c8a24a', kind: 'coat', lines: ['ATELIER NOIR'],
}));
fs.writeFileSync(path.join(DIR, 'slider-2.svg'), banner({
  c1: '#141a22', c2: '#060a10', accent: '#8fa8c8', kind: 'jeans', lines: ['DENIM ATELIER'],
}));
fs.writeFileSync(path.join(DIR, 'slider-3.svg'), banner({
  c1: '#1a1712', c2: '#080605', accent: '#d4af37', kind: 'shoes', lines: ['FOOTWEAR MAISON'],
}));

console.log('Slider banners generated.');
