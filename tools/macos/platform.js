'use strict';
// Turns a full-bleed icon into what each platform wants: a macOS/desktop squircle with margin and shadow, resized PNG sets, .ico and .icns.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const PNG = require('../sprite/png.js');
const { boxBlur, clamp } = require('./engine.js');

/** Area-average resample of { w, h, d: RGBA float } to size x size. */
function resample(cv, size) {
  if (cv.w === size) return cv;
  const f = cv.w / size, d = new Float32Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0, wsum = 0;
    const x0 = x * f, x1 = (x + 1) * f, y0 = y * f, y1 = (y + 1) * f;
    for (let yy = Math.floor(y0); yy < Math.min(cv.h, Math.ceil(y1)); yy++) { const wy = Math.min(yy + 1, y1) - Math.max(yy, y0);
      for (let xx = Math.floor(x0); xx < Math.min(cv.w, Math.ceil(x1)); xx++) { const w = wy * (Math.min(xx + 1, x1) - Math.max(xx, x0)), i = (yy * cv.w + xx) * 4, al = cv.d[i + 3]; r += cv.d[i] * al * w; g += cv.d[i + 1] * al * w; b += cv.d[i + 2] * al * w; a += al * w; wsum += w; } }
    const o = (y * size + x) * 4; d[o + 3] = a / wsum; if (a > 0) { d[o] = r / a; d[o + 1] = g / a; d[o + 2] = b / a; }
  }
  return toCanvas(size, size, d);
}
function toCanvas(w, h, d) {
  const cv = { w, h, d };
  cv.toRGBA = () => { const o = new Uint8Array(w * h * 4); for (let i = 0; i < w * h; i++) { const a = d[i * 4 + 3]; o[i * 4] = clamp(Math.round(d[i * 4] * 255), 0, 255); o[i * 4 + 1] = clamp(Math.round(d[i * 4 + 1] * 255), 0, 255); o[i * 4 + 2] = clamp(Math.round(d[i * 4 + 2] * 255), 0, 255); o[i * 4 + 3] = clamp(Math.round(a * 255), 0, 255); } return o; };
  return cv;
}
const sdSquircle = (px, py, a) => (Math.pow(Math.pow(Math.abs(px) / a, 5) + Math.pow(Math.pow(Math.abs(py) / a, 5), 1) , 1 / 5) - 1) * a * 0.93;

/**
 * The desktop icon: the artwork drawn at `art` of the canvas (0.805 is the macOS template), clipped to a squircle, with a soft shadow.
 * `src(n)` must return the full-bleed artwork rendered natively at n pixels.
 */
function desktop(src, S, opts) {
  opts = opts || {}; const art = opts.art || 0.805, shadow = opts.shadow !== false, n = Math.round(S * art), off = Math.round((S - n) / 2);
  const icon = src(n), d = new Float32Array(S * S * 4), a = n / 2, c = S / 2, sh = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const cov = clamp(0.5 - sdSquircle(x + 0.5 - c, y + 0.5 - c, a), 0, 1); if (cov > 0) { const ix = x - off, iy = y - off; if (ix >= 0 && iy >= 0 && ix < n && iy < n) { const i = (iy * n + ix) * 4, o = (y * S + x) * 4; d[o] = icon.d[i]; d[o + 1] = icon.d[i + 1]; d[o + 2] = icon.d[i + 2]; d[o + 3] = cov; } } sh[y * S + x] = cov; }
  if (shadow && S >= 64) {
    const dy = Math.round(S * 0.012), blurred = boxBlur(sh, S, Math.max(1, S * 0.012));
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const o = (y * S + x) * 4, s = (y - dy >= 0 ? blurred[(y - dy) * S + x] : 0) * 0.34, A = d[o + 3]; if (s <= 0) continue;
      const oa = A + s * (1 - A); if (oa > 0) { d[o] = (d[o] * A + 0.05 * s * (1 - A)) / oa; d[o + 1] = (d[o + 1] * A + 0.0 * s * (1 - A)) / oa; d[o + 2] = (d[o + 2] * A + 0.02 * s * (1 - A)) / oa; d[o + 3] = oa; } }
  }
  return toCanvas(S, S, d);
}
/** The artwork filled into a squircle with no margin (favicons, small sizes). */
const squircleFill = (icon) => desktop(() => icon, icon.w, { art: 1, shadow: false });

const png = (cv) => PNG.encode(cv.w, cv.h, cv.toRGBA());
function ico(entries) { // entries: [{ size, png: Buffer }]
  const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(entries.length, 4);
  let off = 6 + 16 * entries.length; const dirs = [], bodies = [];
  for (const e of entries) { const d = Buffer.alloc(16); d[0] = e.size >= 256 ? 0 : e.size; d[1] = e.size >= 256 ? 0 : e.size; d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6); d.writeUInt32LE(e.png.length, 8); d.writeUInt32LE(off, 12); off += e.png.length; dirs.push(d); bodies.push(e.png); }
  return Buffer.concat([head, ...dirs, ...bodies]);
}
/** .icns via macOS iconutil. pngs: { 16: Buffer, 32:..., 64, 128, 256, 512, 1024 }. Returns false when iconutil is not available. */
function icns(outFile, pngs, tmp) {
  try {
    const set = path.join(tmp, 'x.iconset'); fs.rmSync(set, { recursive: true, force: true }); fs.mkdirSync(set, { recursive: true });
    const map = { 'icon_16x16.png': 16, 'icon_16x16@2x.png': 32, 'icon_32x32.png': 32, 'icon_32x32@2x.png': 64, 'icon_128x128.png': 128, 'icon_128x128@2x.png': 256, 'icon_256x256.png': 256, 'icon_256x256@2x.png': 512, 'icon_512x512.png': 512, 'icon_512x512@2x.png': 1024 };
    for (const [f, s] of Object.entries(map)) fs.writeFileSync(path.join(set, f), Buffer.from(pngs[s]));
    execFileSync('iconutil', ['-c', 'icns', set, '-o', outFile], { stdio: 'pipe' }); fs.rmSync(set, { recursive: true, force: true }); return true;
  } catch (e) { return false; }
}
module.exports = { resample, desktop, squircleFill, png, ico, icns, toCanvas };
