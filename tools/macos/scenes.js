'use strict';
// Wallpapers and widget covers, drawn per pixel at full size in the VigilTech pink, gothic-arch style.
const { clamp, mix, mixc, smooth, hex, RAD, FONT } = require('./engine.js');

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const ramp = (stops, t) => { t = clamp(t, 0, 1); for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return mixc(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0] || 1)); return stops[stops.length - 1][1]; };
const gauss = (d2, s) => Math.exp(-d2 / (2 * s * s));
const sdStar = (px, py, r) => { const ax = Math.abs(px), ay = Math.abs(py); return Math.max(Math.max(ax, ay) - r, -(Math.hypot(ax - r, ay - r) - r)); };

class Img {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Float32Array(w * h * 4); }
  set(x, y, c) { const i = (y * this.w + x) * 4; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 1; }
  get(x, y) { const i = (y * this.w + x) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2]]; }
  mixAt(x, y, c, a) { if (a <= 0.001) return; const i = (y * this.w + x) * 4, d = this.d; d[i] += (c[0] - d[i]) * a; d[i + 1] += (c[1] - d[i + 1]) * a; d[i + 2] += (c[2] - d[i + 2]) * a; }
  toRGBA() { const o = new Uint8Array(this.w * this.h * 4); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const i = (y * this.w + x) * 4, n = (((x * 7 + y * 13) & 15) / 15 - 0.5) / 255; for (let c = 0; c < 3; c++) o[i + c] = clamp(Math.round((this.d[i + c] + n) * 255), 0, 255); o[i + 3] = 255; } return o; }
  /** Fill every pixel from fn(x, y, u, v) -> [r,g,b]; u,v are 0..1. */
  fill(fn) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.set(x, y, fn(x, y, x / this.w, y / this.h)); return this; }
  rect(x0, y0, x1, y1, c, a) { for (let y = Math.max(0, Math.floor(y0)); y < Math.min(this.h, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(this.w, Math.ceil(x1)); x++) { const cx = Math.min(x + 1, x1) - Math.max(x, x0), cy = Math.min(y + 1, y1) - Math.max(y, y0); this.mixAt(x, y, c, a * clamp(cx, 0, 1) * clamp(cy, 0, 1)); } }
  cross(x, y, h, c, a) { const t = h * 0.14; this.rect(x - t / 2, y - h / 2, x + t / 2, y + h / 2, c, a); this.rect(x - h * 0.32, y - h * 0.2 - t / 2, x + h * 0.32, y - h * 0.2 + t / 2, c, a); }
  /** A candle flame: two arcs meeting in points, lit. */
  flame(cx, cy, hh, c, a) { const hw = hh * 0.46, R = (hh * hh + hw * hw) / (2 * hw), k = R - hw; for (let y = Math.floor(cy - hh - 1); y <= cy + hh + 1; y++) for (let x = Math.floor(cx - hw - 1); x <= cx + hw + 1; x++) { const px = x + 0.5 - cx, py = y + 0.5 - cy, d = Math.max(Math.hypot(px - k, py) - R, Math.hypot(px + k, py) - R); const cv = clamp(0.5 - d, 0, 1); if (cv > 0) this.mixAt(x, y, c, a * cv); } this.glow(cx, cy, hh * 1.6, c, a * 0.28); }
  /** Add a glow disc. */
  glow(cx, cy, r, c, a) { const R = Math.ceil(r * 3.2); for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(this.h, cy + R); y++) for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(this.w, cx + R); x++) this.mixAt(x, y, c, a * gauss((x - cx) ** 2 + (y - cy) ** 2, r)); }
  /** A four-point star with a halo. */
  star(cx, cy, r, c, a, halo) {
    const R = Math.ceil(r * 2 + 2);
    for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(this.h, cy + R); y++) for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(this.w, cx + R); x++) {
      const px = x + 0.5 - cx, py = y + 0.5 - cy, cov = clamp(0.5 - sdStar(px, py, r), 0, 1); if (cov > 0) this.mixAt(x, y, c, a * cov);
    }
    if (halo) this.glow(cx, cy, r * halo * 0.7, mixc(c, P.pink, 0.55), a * 0.22);
  }
  text(str, x, base, em, c, a, align) {
    const k = em / FONT.unitsPerEm; let w = 0; for (const ch of str) w += FONT.glyphs[ch] ? FONT.glyphs[ch].adv : 500; w *= k;
    let cx = align === 'c' ? x - w / 2 : align === 'r' ? x - w : x; const SS = 4;
    for (const ch of str) {
      const G = FONT.glyphs[ch]; if (!G) { cx += 500 * k; continue; }
      const polys = G.contours.map((p) => p.map(([px, py]) => [cx + px * k, base - py * k]));
      let y0 = 1e9, y1 = -1e9; for (const p of polys) for (const q of p) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
      for (let py = Math.max(0, Math.floor(y0)); py <= Math.min(this.h - 1, Math.ceil(y1)); py++) {
        const acc = new Map();
        for (let s = 0; s < SS; s++) {
          const sy = py + (s + 0.5) / SS, xs = [];
          for (const p of polys) for (let i = 0; i < p.length; i++) { const [ax, ay] = p[i], [bx, by] = p[(i + 1) % p.length]; if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push([ax + ((sy - ay) / (by - ay)) * (bx - ax), by > ay ? 1 : -1]); }
          xs.sort((p, q) => p[0] - q[0]); let wind = 0;
          for (let i = 0; i < xs.length - 1; i++) { wind += xs[i][1]; if (wind !== 0) { const xa = clamp(xs[i][0], 0, this.w), xb = clamp(xs[i + 1][0], 0, this.w); for (let px = Math.floor(xa); px < Math.ceil(xb); px++) acc.set(px, (acc.get(px) || 0) + (Math.min(px + 1, xb) - Math.max(px, xa)) / SS); }}
        }
        for (const [px, v] of acc) this.mixAt(px, py, c, clamp(v, 0, 1) * a);
      }
      cx += G.adv * k;
    }
  }
}

/** Lancet arch: depth inside (px, positive inside) for an arch whose base is at y = base, half-width w, centred at cx. */
const archDepth = (x, y, cx, base, w) => y > base ? -(y - base) : Math.min(2 * w - Math.hypot(x - (cx - w), y - base), 2 * w - Math.hypot(x - (cx + w), y - base));
function archLines(img, cx, base, w, lineC, a, sigma, fillC, fillA) {
  const apex = base - Math.sqrt(3) * w, x0 = Math.max(0, Math.floor(cx - w - sigma * 4)), x1 = Math.min(img.w, Math.ceil(cx + w + sigma * 4)), y0 = Math.max(0, Math.floor(apex - sigma * 4)), y1 = Math.min(img.h, Math.ceil(base));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const d = archDepth(x + 0.5, y + 0.5, cx, base, w);
    if (d > 0 && fillA) img.mixAt(x, y, fillC, fillA * smooth(0, w * 0.6, d) * smooth(base, base - w * 0.3, y + 0.5));
    const fade = smooth(base, base - w * 0.3, y);
    img.mixAt(x, y, lineC, fade * (a * gauss(d * d, sigma) + a * 0.35 * gauss(d * d, sigma * 5) * (d > -sigma * 12 && d < sigma * 12 ? 1 : 0)));
  }
}
function starField(img, n, seed, c, region, rmax, alpha) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) { const x = region[0] + R() * (region[2] - region[0]), y = region[1] + R() * (region[3] - region[1]), r = rmax * (0.18 + 0.82 * Math.pow(R(), 3)); img.star(x, y, r, c, alpha * (0.5 + 0.5 * R()), r > rmax * 0.5 ? 3.2 : 0); }
}
function hills(img, base, amp, freq, phase, c, soft) {
  for (let x = 0; x < img.w; x++) {
    const u = x / img.w, h = base + amp * (Math.sin(u * freq + phase) * 0.55 + Math.sin(u * freq * 2.3 + phase * 1.7) * 0.28 + Math.sin(u * freq * 5.1 + phase * 0.6) * 0.1);
    for (let y = Math.max(0, Math.floor(h - 2)); y < img.h; y++) img.mixAt(x, y, c, clamp(y + 0.5 - h, 0, 1) * (soft || 1));
  }
}
const P = { pink: hex('#ff0058'), hi: hex('#ff6a9b'), glow: hex('#ff8fb3'), white: hex('#fff4f8'), ink: hex('#12060f'), plum: hex('#2b0a1e'), wine: hex('#5a0a2c'), deep: hex('#1f0009') };

// ================================================================================================= wallpapers
const WALL = {};
WALL['nave'] = (W, H) => {
  const img = new Img(W, H), u = W / 1290;
  img.fill((x, y, nx, ny) => { let c = ramp([[0, hex('#0f050c')], [0.5, P.plum], [1, hex('#6a0a38')]], Math.pow(ny, 1.1)); return mixc(c, P.pink, 0.4 * gauss(((nx - 0.5) * W) ** 2 + ((ny - 1.02) * H) ** 2, 0.34 * W)); });
  starField(img, 70, 11, hex('#ffd9e6'), [0, 0, W, H * 0.5], 15 * u, 0.85);
  const mx = W * 0.8, my = H * 0.19, R = 78 * u; img.glow(mx, my, R * 2.2, P.glow, 0.22);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (Math.abs(x - mx) > R + 2 || Math.abs(y - my) > R + 2) continue; const d = Math.max(Math.hypot(x - mx, y - my) - R, -(Math.hypot(x - mx - R * 0.5, y - my - R * 0.1) - R * 0.88)); img.mixAt(x, y, [1, 0.93, 0.96], clamp(0.5 - d, 0, 1) * 0.92); }
  const n = 4, w = W / (2 * n);
  for (let row = 0; row < 2; row++) for (let i = 0; i < n + 1; i++) {
    const cx = (row ? 0 : w) + i * 2 * w, base = H * (1.0 + 0.0) + (row ? 0 : 0) - (row ? 0 : 0) + (row ? H * 0.0 : 0);
    for (const [k, a, f] of [[0.97, 0.55, 0.1], [0.78, 0.38, 0], [0.58, 0.28, 0]]) archLines(img, cx, base - (row ? 0 : w * 0.95), w * k, P.glow, a * (row ? 0.7 : 1), 2.2 * u, P.pink, f);
  }
  for (let i = 0; i < 8; i++) { const fx = W * (0.08 + i * 0.12), fy = H * (0.52 + (i % 3) * 0.035); img.flame(fx, fy, 26 * u, [1, 0.7, 0.82], 0.95); img.rect(fx - 6 * u, fy + 30 * u, fx + 6 * u, fy + 120 * u, [1, 0.85, 0.9], 0.8); }
  img.glow(W * 0.5, H * 1.02, W * 0.5, P.pink, 0.16);
  return img;
};
WALL['our-lady'] = (W, H) => {
  const img = new Img(W, H), u = W / 1290;
  img.fill((x, y, nx, ny) => { let c = ramp([[0, hex('#ffb3cc')], [0.4, hex('#ff3d7a')], [0.72, P.pink], [1, hex('#5a0a2c')]], ny); return mixc(c, [1, 1, 1], 0.28 * gauss(((nx - 0.3) * W) ** 2 + ((ny - 0.18) * H) ** 2, 0.35 * W)); });
  const cx = W * 0.5, cy = H * 0.6, R = 300 * u; img.glow(cx, cy, R * 1.5, [1, 0.9, 0.95], 0.28);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 2 * Math.PI; img.star(cx + 200 * u * Math.cos(a), H * 0.36 + 200 * u * Math.sin(a), 32 * u, [1, 1, 1], 0.95, 3); }
  for (let y = Math.floor(cy - R - 3); y < cy + R + 3; y++) for (let x = Math.floor(cx - R - 3); x < cx + R + 3; x++) { const d = Math.max(Math.hypot(x - cx, y - cy) - R, -(Math.hypot(x - cx - R * 0.34, y - cy + R * 0.08) - R * 0.88)); const cv = clamp(0.5 - d, 0, 1); if (cv > 0) img.mixAt(x, y, mixc([1, 1, 1], hex('#ffd0e0'), smooth(cy - R, cy + R, y)), 0.95 * cv); }
  starField(img, 60, 5, [1, 1, 1], [0, 0, W, H * 0.62], 16 * u, 0.9);
  hills(img, H * 0.82, 70 * u, 7, 1.1, hex('#b0003c'), 0.95); hills(img, H * 0.88, 60 * u, 5, 3.0, hex('#7a0030'), 1); hills(img, H * 0.94, 45 * u, 8, 0.2, hex('#3d0016'), 1);
  img.star(W * 0.82, H * 0.82, 20 * u, [1, 0.8, 0.88], 0.8, 3);
  return img;
};
WALL['bethlehem'] = (W, H) => {
  const img = new Img(W, H), u = W / 1290, R = rng(77);
  img.fill((x, y, nx, ny) => { let c = ramp([[0, hex('#0b040a')], [0.6, hex('#1d0818')], [1, hex('#3a0a2a')]], ny); c = mixc(c, P.pink, 0.3 * gauss(((nx - 0.15) * W) ** 2 + ((ny - 0.2) * H) ** 2, 0.4 * W)); return mixc(c, hex('#a8184f'), 0.25 * gauss(((nx - 0.9) * W) ** 2 + ((ny - 0.85) * H) ** 2, 0.45 * W)); });
  for (let i = 0; i < 46; i++) {
    const x = R() * W, y = R() * H, r = (6 + 38 * Math.pow(R(), 3.2)) * u, len = r * (6 + R() * 14), dx = -0.32, dy = -1, nrm = Math.hypot(dx, dy);
    for (let t = 0; t < len; t += 2) { const f = 1 - t / len, px = x - (dx / nrm) * -t * 0.0 + (dx / nrm) * t * -1 * -1, py = y + (dy / nrm) * t * -1 * -1; img.glow(x + (-dx / nrm) * -t, y + (-dy / nrm) * -t, r * 0.28 * f + 0.8, P.glow, 0.05 * f * f); }
    img.star(x, y, r, [1, 0.92, 0.96], 0.95, r > 14 * u ? 3.5 : 0);
  }
  const sx = W * 0.5, sy = H * 0.34; for (let y = sy; y < H; y += 2) { const f = 1 - (y - sy) / (H - sy); for (let x = Math.floor(sx - 140 * u); x < sx + 140 * u; x += 2) img.mixAt(x, Math.floor(y), P.glow, 0.16 * f * f * gauss((x - sx) ** 2, 34 * u * (0.5 + 0.8 * (1 - f)))); }
  img.glow(sx, sy, 150 * u, P.pink, 0.4); img.star(sx, sy, 120 * u, [1, 0.95, 0.97], 1, 2.2);
  hills(img, H * 0.9, 60 * u, 5, 0.7, hex('#14060f'), 1);
  return img;
};
WALL['rose-window'] = (W, H) => {
  const img = new Img(W, H), u = W / 1290, cx = W / 2, cy = H * 0.5;
  img.fill((x, y, nx, ny) => { const d = Math.hypot(x - cx, y - cy) / W; let c = ramp([[0, hex('#3a0a2a')], [0.5, hex('#1d0818')], [1, hex('#0b040a')]], d * 1.4); return mixc(c, P.pink, 0.4 * gauss((x - cx) ** 2 + (y - cy) ** 2, 0.2 * W)); });
  const lines = P.glow, S = 2.2 * u;
  const rim = (r, a, s) => { for (let y = Math.max(0, Math.floor(cy - r - 20)); y < Math.min(H, cy + r + 20); y++) for (let x = Math.max(0, Math.floor(cx - r - 20)); x < Math.min(W, cx + r + 20); x++) { const d = Math.hypot(x - cx, y - cy) - r; if (Math.abs(d) < s * 6) img.mixAt(x, y, lines, a * gauss(d * d, s)); } };
  [0.44, 0.425, 0.3, 0.29, 0.16, 0.15].forEach((r, i) => rim(r * W, i % 2 ? 0.28 : 0.6, S));
  const petals = (n, base, w, a, off, fillA) => {
    const R0 = base * W, ww = w * W;
    for (let y = Math.max(0, Math.floor(cy - R0 - ww * 3)); y < Math.min(H, cy + R0 + ww * 3); y++) for (let x = Math.max(0, Math.floor(cx - R0 - ww * 3)); x < Math.min(W, cx + R0 + ww * 3); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy); if (r < R0 - 6 * S || r > R0 + ww * 2.1) continue;
      let th = Math.atan2(dy, dx) / RAD - off, k = Math.round(th / (360 / n)), dth = (th - k * (360 / n)) * RAD, uu = dth * r, vv = -(r - R0);
      const d = archDepth(uu, vv, 0, 0, ww);
      if (d > 0 && fillA) img.mixAt(x, y, P.pink, fillA * smooth(0, ww * 0.5, d));
      img.mixAt(x, y, lines, a * gauss(d * d, S));
    }
  };
  petals(12, 0.15, 0.062, 0.7, 0, 0.14); petals(12, 0.3, 0.071, 0.55, 15, 0.1);
  img.glow(cx, cy, 170 * u, P.pink, 0.4); img.cross(cx, cy + 30 * u, 150 * u, [1, 0.92, 0.96], 0.96);
  starField(img, 36, 3, [1, 0.88, 0.93], [0, 0, W, H], 10 * u, 0.6);
  return img;
};
WALL['paschal-dawn'] = (W, H) => {
  const img = new Img(W, H), u = W / 1290;
  img.fill((x, y, nx, ny) => ramp([[0, hex('#0d050f')], [0.35, hex('#2b0a2a')], [0.62, hex('#a8003f')], [0.72, P.pink], [1, hex('#3d0016')]], ny));
  starField(img, 80, 21, [1, 0.9, 0.95], [0, 0, W, H * 0.45], 12 * u, 0.9);
  const mx = W * 0.5, my = H * 0.62, R = 170 * u; img.glow(mx, my, R * 3, P.glow, 0.32); img.glow(mx, my, R * 1.4, [1, 0.9, 0.95], 0.22);
  for (let i = 0; i < 18; i++) { const a = Math.PI + (i / 17) * Math.PI; for (let t = R * 1.15; t < R * (2.0 + 0.5 * (i % 2)); t += 2) img.mixAt(clamp(Math.floor(mx + t * Math.cos(a)), 0, W - 1), clamp(Math.floor(my + t * Math.sin(a)), 0, H - 1), P.glow, 0.5 * (1 - (t - R) / (R * 1.4))); }
  for (let y = Math.floor(my - R - 3); y < my + R + 3; y++) for (let x = Math.floor(mx - R - 3); x < mx + R + 3; x++) { const cv = clamp(0.5 - (Math.hypot(x - mx, y - my) - R), 0, 1); if (cv > 0) img.mixAt(x, y, mixc([1, 0.96, 0.98], hex('#ffc2d6'), smooth(my - R, my + R, y)), cv); }
  hills(img, H * 0.66, 70 * u, 6, 0.4, hex('#8a0035'), 1); hills(img, H * 0.74, 90 * u, 4.5, 2.2, hex('#5a0a2c'), 1); hills(img, H * 0.83, 70 * u, 7.5, 4.1, hex('#2b0a1e'), 1); hills(img, H * 0.92, 50 * u, 5, 1.0, hex('#0f050c'), 1);
  // the cross on the ridge, lit from behind
  const kx = W * 0.76, ky = H * 0.7; img.glow(kx, ky - 60 * u, 120 * u, P.pink, 0.3); img.cross(kx, ky - 40 * u, 230 * u, hex('#0f050c'), 1);
  return img;
};

WALL['candlelight'] = (W, H) => {
  const img = new Img(W, H), u = W / 1290, R = rng(9);
  img.fill((x, y, nx, ny) => mixc(ramp([[0, hex('#0b040a')], [0.55, hex('#1d0818')], [1, hex('#3d0a2a')]], ny), P.pink, 0.45 * gauss(((nx - 0.5) * W) ** 2 + ((ny - 0.95) * H) ** 2, 0.4 * W)));
  const rows = 7, cols = 6;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols + (j % 2); i++) {
    const x = W * ((i + 0.5 - (j % 2) * 0.5) / cols) + (R() - 0.5) * 18 * u, y = H * (0.5 + j * 0.075), s = (0.55 + j * 0.14) * u;
    img.glow(x, y, 70 * s, P.pink, 0.16); img.rect(x - 9 * s, y + 8 * s, x + 9 * s, y + 70 * s, [0.95, 0.78, 0.86], 0.5 + j * 0.06); img.flame(x, y - 8 * s, 22 * s, [1, 0.8, 0.88], 0.95);
  }
  starField(img, 40, 4, [1, 0.88, 0.93], [0, 0, W, H * 0.4], 8 * u, 0.6);
  return img;
};

// ================================================================================================= widget covers
const STYLES = {
  rose:  (img, W, H, u) => { img.fill((x, y, nx, ny) => mixc(ramp([[0, hex('#ff5c8f')], [0.55, P.pink], [1, hex('#a80039')]], ny), [1, 1, 1], 0.2 * gauss(((nx - 0.2) * W) ** 2 + ((ny - 0.1) * H) ** 2, 0.4 * Math.max(W, H)))); arches(img, W, H, u, P.white, 0.3); },
  night: (img, W, H, u) => { img.fill((x, y, nx, ny) => mixc(ramp([[0, hex('#2e0a20')], [1, hex('#12050d')]], ny), P.pink, 0.4 * gauss(((nx - 0.5) * W) ** 2 + ((ny - 1.1) * H) ** 2, 0.45 * Math.max(W, H)))); arches(img, W, H, u, P.glow, 0.45); },
  wine:  (img, W, H, u) => { img.fill((x, y, nx, ny) => ramp([[0, hex('#8a0035')], [1, hex('#2a0613')]], ny)); arches(img, W, H, u, P.glow, 0.3); },
  plum:  (img, W, H, u) => { img.fill((x, y, nx, ny) => mixc(ramp([[0, hex('#5a1244')], [1, hex('#1c0a22')]], ny), P.pink, 0.18 * gauss(((nx - 0.9) * W) ** 2 + ((ny - 0.0) * H) ** 2, 0.4 * Math.max(W, H)))); arches(img, W, H, u, P.glow, 0.32); },
  blush: (img, W, H, u) => { img.fill((x, y, nx, ny) => ramp([[0, hex('#ffd0e0')], [0.5, hex('#ff9fbd')], [1, hex('#ff4d85')]], ny)); arches(img, W, H, u, [1, 1, 1], 0.5); },
  stars: (img, W, H, u) => { img.fill((x, y, nx, ny) => mixc(ramp([[0, hex('#0b040a')], [1, hex('#2b0a1e')]], ny), P.pink, 0.22 * gauss(((nx - 0.1) * W) ** 2 + ((ny - 0.0) * H) ** 2, 0.4 * Math.max(W, H)))); starField(img, Math.round(W * H / 14000), W + H, [1, 0.9, 0.95], [0, 0, W, H], 9 * u, 0.9); },
};
function arches(img, W, H, u, c, a) { const w = Math.min(W, H) * 0.34; for (let i = 0; i < Math.ceil(W / (2 * w)) + 1; i++) { archLines(img, i * 2 * w + w * 0.4, H * 1.05, w * 0.95, c, a, 1.8 * u, c, 0.05); archLines(img, i * 2 * w + w * 0.4, H * 1.05, w * 0.6, c, a * 0.6, 1.5 * u, c, 0); } }
function cover(W, H, style, label) {
  const img = new Img(W, H), u = Math.min(W, H) / 474; STYLES[style](img, W, H, u);
  img.star(W - 34 * u, 34 * u, 11 * u, [1, 1, 1], 0.95, 3.4);
  if (label) { const light = style === 'rose' || style === 'blush'; img.text(label, 30 * u, H - 32 * u, 40 * u, light ? [1, 1, 1] : [1, 0.82, 0.9], 0.96); }
  return img;
}
const textW = (str, em) => { let w = 0; for (const ch of str) w += FONT.glyphs[ch] ? FONT.glyphs[ch].adv : 500; return (w * em) / FONT.unitsPerEm; };
/** A cover with a line of Latin set large and centred, a small cross above it. */
function verse(W, H, style, line, sub) {
  const img = cover(W, H, style), u = Math.min(W, H) / 474, em = Math.min(W * 0.78 / (textW(line, 1)), H * 0.26), light = style === 'rose' || style === 'blush', ink = light ? [1, 1, 1] : [1, 0.86, 0.92];
  img.cross(W / 2, H * 0.24, 38 * u, ink, 0.9); img.text(line, W / 2, H * 0.6 + em * 0.2, em, ink, 0.97, 'c');
  if (sub) img.text(sub, W / 2, H * 0.6 + em * 0.2 + 64 * u, 24 * u, ink, 0.7, 'c');
  return img;
}
module.exports = { Img, WALL, cover, verse, STYLES, P };
Object.assign(module.exports, { archLines, archDepth, starField, hills, rng, ramp, gauss, textW });
