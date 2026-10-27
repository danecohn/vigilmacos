'use strict';
// Desktop wallpapers (16:10 and up), each in a night version and a dawn version for Light and Dark appearance.
const S = require('./scenes.js');
const { Img, P, archLines, starField, hills, ramp, gauss } = S;
const { clamp, mixc, smooth, hex } = require('./engine.js');
const PAL = {
  night: { sky: [[0, hex('#0f050c')], [0.5, hex('#2b0a1e')], [1, hex('#8a0a40')]], line: hex('#ff8fb3'), star: hex('#ffd9e6'), glow: hex('#ff0058'), moon: [1, 0.93, 0.96], h1: hex('#8a0035'), h2: hex('#5a0a2c'), h3: hex('#2b0a1e'), h4: hex('#0f050c') },
  dawn:  { sky: [[0, hex('#fff1f6')], [0.5, hex('#ffb3cc')], [1, hex('#ff5c8f')]], line: hex('#ffffff'), star: [1, 1, 1], glow: [1, 1, 1], moon: [1, 1, 1], h1: hex('#ff3d7a'), h2: hex('#e0004f'), h3: hex('#a8003a'), h4: hex('#5a0a2c') },
};
const sky = (img, p, glowY, glowA) => img.fill((x, y, nx, ny) => mixc(ramp(p.sky, Math.pow(ny, 1.05)), p.glow, glowA * gauss(((nx - 0.5) * img.w) ** 2 + ((ny - glowY) * img.h) ** 2, 0.34 * img.w)));
const DESK = {};
DESK.nave = (W, H, v) => {
  const img = new Img(W, H), p = PAL[v], u = H / 1100; sky(img, p, 1.05, v === 'night' ? 0.4 : 0.25);
  starField(img, 110, 3, p.star, [0, 0, W, H * 0.55], 9 * u, v === 'night' ? 0.85 : 0.6);
  const mx = W * 0.8, my = H * 0.22, R = 64 * u; img.glow(mx, my, R * 2.2, p.moon, 0.2);
  for (let y = Math.floor(my - R - 2); y < my + R + 2; y++) for (let x = Math.floor(mx - R - 2); x < mx + R + 2; x++) { const d = Math.max(Math.hypot(x - mx, y - my) - R, -(Math.hypot(x - mx - R * 0.5, y - my - R * 0.1) - R * 0.88)); img.mixAt(x, y, p.moon, clamp(0.5 - d, 0, 1) * 0.92); }
  const n = 9, w = W / (2 * n);
  for (let row = 0; row < 2; row++) for (let i = 0; i < n + 1; i++) { const cx = (row ? 0 : w) + i * 2 * w, base = H - (row ? 0 : w * 0.95) + 2; for (const [k, a, f] of [[0.97, 0.55, 0.1], [0.78, 0.38, 0], [0.58, 0.28, 0]]) archLines(img, cx, base, w * k, p.line, a * (row ? 0.7 : 1), 2.2 * u, P.pink, f); }
  return img;
};
DESK.ridge = (W, H, v) => {
  const img = new Img(W, H), p = PAL[v], u = H / 1100; sky(img, p, 0.66, v === 'night' ? 0.5 : 0.35);
  starField(img, 90, 21, p.star, [0, 0, W, H * 0.45], 8 * u, v === 'night' ? 0.85 : 0.0);
  const mx = W * 0.5, my = H * 0.6, R = 120 * u; img.glow(mx, my, R * 3, p.moon, 0.3); img.glow(mx, my, R * 1.4, p.moon, 0.2);
  for (let y = Math.floor(my - R - 2); y < my + R + 2; y++) for (let x = Math.floor(mx - R - 2); x < mx + R + 2; x++) img.mixAt(x, y, p.moon, clamp(0.5 - (Math.hypot(x - mx, y - my) - R), 0, 1));
  hills(img, H * 0.66, 90 * u, 6, 0.4, p.h1, 1); hills(img, H * 0.74, 100 * u, 4.5, 2.2, p.h2, 1); hills(img, H * 0.84, 80 * u, 7.5, 4.1, p.h3, 1); hills(img, H * 0.93, 60 * u, 5, 1.0, p.h4, 1);
  return img;
};
DESK.starfall = (W, H, v) => {
  const img = new Img(W, H), p = PAL[v], u = H / 1100, R = S.rng(77); sky(img, p, 0.2, v === 'night' ? 0.45 : 0.3);
  for (let i = 0; i < 70; i++) { const x = R() * W, y = R() * H, r = (4 + 26 * Math.pow(R(), 3.2)) * u, len = r * (6 + R() * 12); for (let t = 0; t < len; t += 3) { const f = 1 - t / len; img.glow(x + 0.32 * t, y - 0.95 * t * -1, r * 0.3 * f + 0.8, p.line, 0.04 * f * f * (v === 'night' ? 1 : 0.8)); } img.star(x, y, r, p.star, v === 'night' ? 0.95 : 0.9, r > 10 * u ? 3 : 0); }
  return img;
};
DESK['rose-window'] = (W, H, v) => {
  const img = new Img(W, H), p = PAL[v], u = H / 1100, cx = W / 2, cy = H / 2, M = H; sky(img, p, 0.5, v === 'night' ? 0.4 : 0.3);
  const rim = (r, a, s) => { for (let y = Math.max(0, Math.floor(cy - r - 20)); y < Math.min(H, cy + r + 20); y++) for (let x = Math.max(0, Math.floor(cx - r - 20)); x < Math.min(W, cx + r + 20); x++) { const d = Math.hypot(x - cx, y - cy) - r; if (Math.abs(d) < s * 6) img.mixAt(x, y, p.line, a * gauss(d * d, s)); } };
  const s = 2.2 * u; [0.44, 0.425, 0.3, 0.29, 0.16, 0.15].forEach((r, i) => rim(r * M, i % 2 ? 0.28 : 0.6, s));
  const petals = (n, base, w, a, off, fillA) => { const R0 = base * M, ww = w * M; for (let y = Math.max(0, Math.floor(cy - R0 - ww * 3)); y < Math.min(H, cy + R0 + ww * 3); y++) for (let x = Math.max(0, Math.floor(cx - R0 - ww * 3)); x < Math.min(W, cx + R0 + ww * 3); x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy); if (r < R0 - 6 * s || r > R0 + ww * 2.1) continue; const th = Math.atan2(dy, dx) * 180 / Math.PI - off, k = Math.round(th / (360 / n)), dth = (th - k * (360 / n)) * Math.PI / 180, d = S.archDepth(dth * r, -(r - R0), 0, 0, ww); if (d > 0 && fillA) img.mixAt(x, y, P.pink, fillA * smooth(0, ww * 0.5, d)); img.mixAt(x, y, p.line, a * gauss(d * d, s)); } };
  petals(12, 0.15, 0.062, 0.7, 0, 0.14); petals(12, 0.3, 0.071, 0.55, 15, 0.1); img.glow(cx, cy, 120 * u, P.pink, 0.4); img.star(cx, cy, 44 * u, p.moon, 0.96, 4);
  return img;
};
module.exports = { DESK };
