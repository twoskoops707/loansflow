#!/usr/bin/env node
/* Builds the LoansFlow brand assets from hand-drawn outlines (no fonts, so the logo is identical on every device):
     public/img/logo.svg         horizontal lockup for dark backgrounds (transparent)
     public/img/logo-light.svg   lockup for light backgrounds
     public/img/mark.svg + favicon.svg   the symbol: an emerald "L" whose foot turns into a gold arrow (capital that flows and grows)
     public/img/favicon-32.png, apple-touch-180.png, logo.png (512 square, used in schema), og-card.png (1200x630), public/favicon.ico
   PNG output needs: npm i --no-save @resvg/resvg-js     Run: node scripts/build-brand.js */
const fs = require('fs'), path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const IMG = path.join(__dirname, '..', 'public', 'img'), PUB = path.join(__dirname, '..', 'public');
const EM = '#34d59a', EM_D = '#127a68', IVORY = '#f4f7f5', INK_L = '#0e1f1b';

/* ---- the symbol, 64x64 ---- */
const GRADS = `<defs>
  <linearGradient id="lg" gradientUnits="userSpaceOnUse" x1="20" y1="13" x2="34" y2="52"><stop offset="0" stop-color="#46e6ad"/><stop offset="1" stop-color="#22a687"/></linearGradient>
  <linearGradient id="gd" gradientUnits="userSpaceOnUse" x1="34" y1="52" x2="50" y2="26"><stop offset="0" stop-color="#c99b4e"/><stop offset="1" stop-color="#ecd297"/></linearGradient>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#11271f"/><stop offset="1" stop-color="#071018"/></linearGradient>
</defs>`;
const glyph = `<path d="M20 13 V43 A7 7 0 0 0 27 50 H35" fill="none" stroke="url(#lg)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M35 50 C42.5 50 46 45.5 46 38.5 V31" fill="none" stroke="url(#gd)" stroke-width="8" stroke-linecap="round"/>
  <path d="M40.2 34 L46 27.2 L51.8 34" fill="none" stroke="url(#gd)" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>`;
const badge = (full) => `<rect x="${full ? 0 : 1}" y="${full ? 0 : 1}" width="${full ? 64 : 62}" height="${full ? 64 : 62}" rx="${full ? 0 : 15}" fill="url(#bg)"${full ? '' : ' stroke="#34d59a" stroke-opacity=".3" stroke-width="1.5"'}/>`;
const markSvg = (full = false) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="LoansFlow">${GRADS}${badge(full)}${glyph}</svg>`;

/* ---- the wordmark: monoline, round caps. baseline y=40, x-height top y=14, ascender/cap top y=0 ---- */
const G = {
  L: { w: 20, d: 'M0 0 V40 H20' }, o: { w: 26, d: 'M13 14 A13 13 0 1 1 12.99 14 Z' }, a: { w: 26, d: 'M13 14 A13 13 0 1 0 13.01 14 M26 14 V40' },
  n: { w: 26, d: 'M0 14 V40 M0 25 C0 17 6 14 13 14 C21 14 26 18 26 27 V40' }, s: { w: 24, d: 'M23 19 C19 13 5 12 4 21 C3 29 24 25 23 34 C22 42 7 42 1 35' },
  F: { w: 22, d: 'M0 40 V0 H22 M0 20 H17' }, l: { w: 0, d: 'M0 0 V40' }, w: { w: 28, d: 'M0 14 L7 40 L14 19 L21 40 L28 14' }
};
function wordmark(ink, accent, sw = 5.4) {
  const gap = 9; let x = 0, out = '';
  for (const [k, c] of [['L', 0], ['o', 0], ['a', 0], ['n', 0], ['s', 0], ['gap', 14], ['F', 1], ['l', 1], ['o', 1], ['w', 1]]) {
    if (k === 'gap') { x += c - gap; continue; }
    out += `<path transform="translate(${x} 0)" d="${G[k].d}" stroke="${c ? accent : ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`; x += G[k].w + gap;
  }
  return { svg: out, w: x - gap + sw };
}
function lockup(ink, accent) {
  const H = 56, ms = H / 64, wm = wordmark(ink, accent), ws = 0.78, wmW = wm.w * ws, gap = 15, W = Math.round(H + gap + wmW + 3);
  // centre the wordmark's cap-to-baseline band (0..40, +stroke) on the mark's centre
  const wy = H / 2 - (40 * ws) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="LoansFlow"><title>LoansFlow</title>${GRADS}<g transform="scale(${ms})">${badge(false)}${glyph}</g><g transform="translate(${H + gap} ${wy.toFixed(2)}) scale(${ws})">${wm.svg}</g></svg>`;
}
const png = (svg, w) => new Resvg(svg, { fitTo: { mode: 'width', value: w }, background: undefined }).render().asPng();

/* ---- social card 1200x630: large lockup on a dark field with faint flow lines ---- */
function ogCard() {
  const wm = wordmark(IVORY, EM, 5.4), s = 3.1, wmW = wm.w * s, markS = 150 / 64, gap = 44, total = 150 + gap + wmW, x0 = (1200 - total) / 2, y0 = 315 - 75;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><defs><radialGradient id="r" cx=".22" cy=".15" r="1"><stop offset="0" stop-color="#12372d"/><stop offset=".55" stop-color="#0a1612"/><stop offset="1" stop-color="#071018"/></radialGradient></defs>
  <rect width="1200" height="630" fill="url(#r)"/>
  <g fill="none" stroke="#34d59a" stroke-opacity=".09" stroke-width="2"><path d="M-20 520 C250 470 420 560 700 500 S1050 420 1240 460"/><path d="M-20 560 C250 510 430 600 710 540 S1060 460 1240 500"/><path d="M-20 600 C260 550 440 640 720 580 S1070 500 1240 540"/></g>
  ${GRADS}<g transform="translate(${x0.toFixed(1)} ${y0}) scale(${markS.toFixed(4)})">${badge(false)}${glyph}</g>
  <g transform="translate(${(x0 + 150 + gap).toFixed(1)} ${(315 - 20 * s).toFixed(1)}) scale(${s})">${wm.svg}</g>
  <rect x="${x0.toFixed(1)}" y="${y0 + 190}" width="${total.toFixed(1)}" height="3" rx="1.5" fill="#d4af6a" fill-opacity=".55"/></svg>`;
}

/* ---- ICO with embedded PNGs ---- */
function ico(sizes) {
  const imgs = sizes.map((s) => png(markSvg(false), s)), head = Buffer.alloc(6 + 16 * imgs.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4);
  let off = head.length; imgs.forEach((b, i) => { const o = 6 + 16 * i; head[o] = sizes[i] % 256; head[o + 1] = sizes[i] % 256; head[o + 2] = 0; head[o + 3] = 0; head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6); head.writeUInt32LE(b.length, o + 8); head.writeUInt32LE(off, o + 12); off += b.length; });
  return Buffer.concat([head, ...imgs]);
}

const w = (f, d) => fs.writeFileSync(path.join(IMG, f), d);
w('logo.svg', lockup(IVORY, EM)); w('logo-light.svg', lockup(INK_L, EM_D));
w('mark.svg', markSvg(false)); w('favicon.svg', markSvg(false));
w('favicon-32.png', png(markSvg(false), 32)); w('apple-touch-180.png', png(markSvg(true), 180));
w('logo.png', png(markSvg(false), 512)); w('og-card.png', png(ogCard(), 1200));
fs.writeFileSync(path.join(PUB, 'favicon.ico'), ico([16, 32, 48]));
console.log('brand assets written to public/img and public/favicon.ico');
