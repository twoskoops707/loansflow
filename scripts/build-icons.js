#!/usr/bin/env node
/* One icon set for the whole site (48x48 line icons in the existing style: .ln green line, .ln2 amber line, .fg/.fa soft fills).
   Writes scripts/icon-map.json {icons, map} (read by apply-nav.py so every menu entry gets a meaningful icon) and updates the cards and counts
   on calculators/index.html. Re-run after adding a calculator.   Run: node scripts/build-icons.js [--sheet out.svg] */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, '..', 'public');
const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

/* reuse the existing loan-type tile icons from the homepage so they stay identical */
const home = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
const tile = {}; for (const m of home.matchAll(/<a class="tile" href="\/loans\/([a-z0-9-]+)"><span class="tile-ico">(<svg[\s\S]*?<\/svg>)/g)) tile[m[1]] = inner(m[2]);
const navIcon = (href) => { const m = home.match(new RegExp('<a href="' + href.replace(/[/#]/g, '\\$&') + '"><i class="mi">(<svg[\\s\\S]*?</svg>)</i>')); return m ? inner(m[1]) : null; };

const I = {
  shield: tile['sba-7a'], building: tile['sba-504'], bolt: tile['sba-express'], sprout: tile['sba-microloan'], tap: tile['line-of-credit'], bank: tile['commercial-term-loan'], gear: tile['equipment-financing'], house: tile['mortgage'],
  compass: navIcon('/alternative-financing/'), pin: navIcon('/directory/'),
  card: '<rect class="ln fg" x="6" y="12" width="36" height="24" rx="4"/><path class="ln2" d="M6 20h36M13 29h8"/>',
  gauge: '<path class="ln fg" d="M7 34 A17 17 0 0 1 41 34 Z"/><path class="ln2" d="M24 34 L33 21"/><circle class="ln" cx="24" cy="34" r="2"/><path class="ln" d="M12 26 l2 1.2 M24 16.5 v3 M36 26 l-2 1.2"/>',
  scale: '<path class="ln" d="M24 8 V40 M14 40 H34 M10 14 H38"/><path class="ln2 fa" d="M10 14 L5 27 H15 Z M38 14 L33 27 H43 Z"/>',
  limit: '<path class="ln fg" d="M9 40 V29 H17 V40 Z M20 40 V21 H28 V40 Z M31 40 V13 H39 V40 Z"/><path class="ln2" stroke-dasharray="3 4" d="M6 8 H42"/>',
  calendar: '<rect class="ln fg" x="7" y="10" width="34" height="31" rx="4"/><path class="ln2" d="M7 19 H41 M16 6 V13 M32 6 V13"/><path class="ln" d="M15 27h4M23 27h4M31 27h2M15 34h4M23 34h4"/>',
  housecheck: '<path class="ln fg" d="M7 23 L24 8 L41 23 V41 H7 Z"/><path class="ln2" d="M16.5 30 l5 5 l10 -11"/>',
  swap: '<path class="ln" d="M9 18 H34 M28 11 l7 7 -7 7"/><path class="ln2" d="M39 32 H14 M20 25 l-7 7 7 7"/>',
  buildings: '<path class="ln fg" d="M8 40 V14 H24 V40 Z M24 40 V22 H40 V40 Z"/><path class="ln2" d="M13 20h6M13 27h6M13 34h6M29 29h6M29 35h6"/><path class="ln" d="M5 41H43"/>',
  barscompare: '<path class="ln fg" d="M8 40 V22 H18 V40 Z"/><path class="ln2 fa" d="M30 40 V11 H40 V40 Z"/><path class="ln" d="M5 41H43"/>',
  splitdoc: '<rect class="ln fg" x="6" y="9" width="16" height="30" rx="3"/><rect class="ln2 fa" x="26" y="9" width="16" height="30" rx="3"/><path class="ln" d="M10 17h8M10 23h8"/><path class="ln2" d="M30 17h8M30 23h8"/>',
  percentarrow: '<circle class="ln fg" cx="20" cy="27" r="13"/><path class="ln2" d="M14 33 L26 21"/><circle class="ln" cx="15.5" cy="22.5" r="1.8"/><circle class="ln" cx="24.5" cy="31.5" r="1.8"/><path class="ln2" d="M31 14 H41 V24 M41 14 L32 23"/>',
  stopwatch: '<circle class="ln fg" cx="24" cy="27" r="14"/><path class="ln" d="M20 7 H28 M24 7 V13"/><path class="ln2" d="M24 27 V19 M24 27 l6 4"/>',
  pricetag: '<path class="ln fg" d="M7 9 H24 L41 26 L26 41 L7 24 Z"/><circle class="ln2" cx="15" cy="17" r="2.5"/><path class="ln2" d="M22 30 l8 -8"/>',
  shieldpct: '<path class="ln fg" d="M24 5 L39 10 V24 C39 33 32 39 24 43 C16 39 9 33 9 24 V10 Z"/><path class="ln2" d="M18 30 L30 17"/><circle class="ln2" cx="18.5" cy="19.5" r="2.2"/><circle class="ln2" cx="29.5" cy="28.5" r="2.2"/>',
  coinsin: '<ellipse class="ln fg" cx="24" cy="38" rx="12" ry="4.5"/><path class="ln" d="M12 38 V32 M36 38 V32"/><ellipse class="ln fg" cx="24" cy="32" rx="12" ry="4.5"/><path class="ln2" d="M24 6 V21 M18 15 l6 6 6 -6"/>',
  storefront: '<path class="ln fg" d="M8 21 V40 H40 V21"/><path class="ln2 fa" d="M6 21 L9 9 H39 L42 21 Z"/><path class="ln" d="M20 40 V29 H28 V40"/>',
  banknote: '<rect class="ln fg" x="5" y="13" width="38" height="22" rx="3"/><circle class="ln2" cx="24" cy="24" r="5"/><path class="ln" d="M11 19 h.1 M37 29 h.1"/>',
  book: '<path class="ln fg" d="M24 12 C19 8 11 8 6 10 V38 C11 36 19 36 24 40 C29 36 37 36 42 38 V10 C37 8 29 8 24 12 Z"/><path class="ln2" d="M24 12 V40"/>',
  magnify: '<circle class="ln fg" cx="21" cy="21" r="13"/><path class="ln2" d="M31 31 L42 42"/><path class="ln" d="M14 24 l5 -5 4 3 6 -7"/>',
  ledger: '<rect class="ln fg" x="9" y="6" width="30" height="36" rx="4"/><path class="ln2" d="M16 15 H32"/><path class="ln" d="M16 24h4M24 24h4M16 31h4M24 31h4M16 37h4M24 37h4"/>',
  receipt: '<path class="ln fg" d="M10 6 H38 V42 L33 38 L28 42 L24 38 L20 42 L15 38 L10 42 Z"/><path class="ln2" d="M17 16 H31 M17 23 H31 M17 30 H25"/>',
  checklist: '<rect class="ln fg" x="8" y="6" width="32" height="36" rx="4"/><path class="ln2" d="M14 16 l3 3 5 -6 M14 29 l3 3 5 -6"/><path class="ln" d="M27 16 H34 M27 29 H34"/>',
  download: '<path class="ln fg" d="M7 30 V40 H41 V30"/><path class="ln2" d="M24 8 V30 M15 22 l9 9 9 -9"/>',
  chart: '<path class="ln fg" d="M8 41 V28 H16 V41 Z M20 41 V17 H28 V41 Z M32 41 V22 H40 V41 Z"/><path class="ln2" d="M7 13 l9 6 9 -8 10 5"/>',
  flag: '<path class="ln" d="M12 6 V42"/><path class="ln2 fa" d="M12 8 H38 L32 17 L38 26 H12 Z"/>',
  newspaper: '<rect class="ln fg" x="6" y="10" width="36" height="28" rx="3"/><path class="ln2" d="M12 17 H24 V26 H12 Z"/><path class="ln" d="M29 17 H36 M29 23 H36 M12 32 H36"/>',
  percent: '<path class="ln2" d="M14 35 L34 13"/><circle class="ln fg" cx="15" cy="15" r="6"/><circle class="ln fg" cx="33" cy="33" r="6"/>',
  ruler: '<path class="ln fg" d="M6 30 L30 6 L42 18 L18 42 Z"/><path class="ln2" d="M15 21 l5 5 M21 15 l3 3 M9 27 l3 3"/>',
  info: '<circle class="ln fg" cx="24" cy="24" r="17"/><path class="ln2" d="M24 22 V33 M24 15.5 v.1"/>',
  person: '<circle class="ln fg" cx="24" cy="17" r="8"/><path class="ln2" d="M8 41 C9 31 16 27 24 27 C32 27 39 31 40 41"/>',
  pen: '<path class="ln fg" d="M9 39 L11 30 L32 9 L39 16 L18 37 Z"/><path class="ln2" d="M28 13 L35 20"/>',
  megaphone: '<path class="ln fg" d="M8 20 H16 L34 9 V39 L16 28 H8 Z"/><path class="ln2" d="M38 18 c3 3 3 9 0 12"/>',
  list: '<path class="ln2" d="M10 14 h.1 M10 24 h.1 M10 34 h.1"/><path class="ln" d="M17 14 H38 M17 24 H38 M17 34 H38"/>',
  mail: '<rect class="ln fg" x="6" y="11" width="36" height="26" rx="3"/><path class="ln2" d="M6 15 L24 28 L42 15"/>',
  doc: '<path class="ln fg" d="M12 5 H30 L38 13 V43 H12 Z"/><path class="ln" d="M30 5 V13 H38 M17 21 H33 M17 27 H33"/><circle class="ln2 fa" cx="25" cy="36" r="4"/>'
};

const MAP = {
  '/calculators/sba-7a': 'shield', '/calculators/sba-504': 'building', '/calculators/sba-express': 'bolt', '/calculators/sba-guarantee-fee': 'shieldpct', '/calculators/sba-equity-injection': 'coinsin',
  '/calculators/business-acquisition': 'storefront', '/calculators/cash-to-close': 'banknote', '/calculators/dscr': 'gauge', '/calculators/global-dscr': 'scale', '/calculators/how-much-can-i-borrow': 'limit',
  '/calculators/line-of-credit': 'card', '/calculators/loan-payment': 'calendar', '/calculators/mortgage-payment': 'house', '/calculators/home-affordability': 'housecheck', '/calculators/refinance-break-even': 'swap',
  '/calculators/commercial-real-estate': 'buildings', '/calculators/equipment-payment': 'gear', '/calculators/equipment-term-comparison': 'barscompare', '/calculators/lease-vs-loan': 'splitdoc',
  '/calculators/merchant-cash-advance-cost': 'percentarrow', '/calculators/prepayment-penalty': 'stopwatch', '/calculators/business-valuation-sde': 'pricetag',
  '/guides/': 'book', '/compare/': 'scale', '/guides/dscr-cpa-view': 'magnify', '/guides/owner-add-backs-ebitda': 'ledger', '/guides/sba-loan-interest-tax-treatment': 'receipt', '/guides/sba-7a-step-by-step': 'checklist',
  '/research/': 'chart', '/resources/': 'download', '/grants/': 'flag', '/news/': 'newspaper', '/loans/sba-7a-rates': 'percent', '/methodology': 'ruler', '/about': 'info', '/author': 'person',
  '/editorial-policy': 'pen', '/disclosure': 'megaphone', '/site-index': 'list', '/contact': 'mail'
};
const missing = Object.entries(I).filter(([, v]) => !v).map(([k]) => k); if (missing.length) { console.error('missing base icons:', missing); process.exit(1); }
fs.writeFileSync(path.join(__dirname, 'icon-map.json'), JSON.stringify({ icons: I, map: MAP }, null, 1) + '\n');

/* ---- calculators index: per-card icon and live counts ---- */
const svgOf = (n) => `<svg class="ico" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${I[n]}</svg>`;
const ip = path.join(PUB, 'calculators', 'index.html'); let h = fs.readFileSync(ip, 'utf8'), n = 0;
h = h.replace(/(<a class="lf-cc" href="(\/calculators\/[a-z0-9-]+)"[^>]*><span class="lf-cc-ico">)<svg[\s\S]*?<\/svg>(<\/span>)/g, (m, a, href, z) => MAP[href] ? (n++, a + svgOf(MAP[href]) + z) : m);
const cards = [...h.matchAll(/<a class="lf-cc" href="[^"]+" data-cat="([a-z]+)"/g)].map((m) => m[1]), total = cards.length, by = (c) => cards.filter((x) => x === c).length;
h = h.replace(/(<button type="button" class="lf-chipbtn is-on" data-f="all">All\s*<span[^>]*>)\d+(<\/span>)/, `$1${total}$2`).replace(/(data-f="sba">SBA and business\s*<span[^>]*>)\d+(<\/span>)/, `$1${by('sba')}$2`)
  .replace(/(data-f="credit">Credit and equipment\s*<span[^>]*>)\d+(<\/span>)/, `$1${by('credit')}$2`).replace(/(data-f="home">Property and home\s*<span[^>]*>)\d+(<\/span>)/, `$1${by('home')}$2`)
  .replace(/\b\d+ free tools for SBA/, `${total} free tools for SBA`);
fs.writeFileSync(ip, h);
console.log(`icon map written (${Object.keys(I).length} icons, ${Object.keys(MAP).length} mapped pages); ${n} calculator cards re-iconed; counts: all ${total}, sba ${by('sba')}, credit ${by('credit')}, home ${by('home')}`);

const si = process.argv.indexOf('--sheet');
if (si > 0) { // review sheet
  const names = Object.keys(I), cols = 9, cell = 120;
  const css = '<style>.ln,.ln2{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-width:2.4}.ln{stroke:#34d59a}.ln2{stroke:#ffb020}.fg{fill:rgba(52,213,154,.14)}.fa{fill:rgba(255,176,32,.18)}</style>';
  const body = names.map((k, i) => `<g transform="translate(${(i % cols) * cell + 20} ${Math.floor(i / cols) * (cell + 22) + 10})"><rect x="-4" y="-4" width="100" height="100" rx="14" fill="#141416" stroke="#2a2a2e"/><g transform="translate(12 12) scale(1.5)">${I[k]}</g><text x="46" y="108" fill="#9aa" font-size="12" text-anchor="middle" font-family="DejaVu Sans">${k}</text></g>`).join('');
  const rows = Math.ceil(names.length / cols);
  fs.writeFileSync(process.argv[si + 1], `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell + 20}" height="${rows * (cell + 22) + 20}">${css}<rect width="100%" height="100%" fill="#0a0a0b"/>${body}</svg>`);
}
