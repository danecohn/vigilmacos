'use strict';
// VigilTech iOS 27 icon engine. Every glyph is drawn from analytic signed-distance primitives at the final pixel size (never scaled), then
// lit like the rest of the VigilTech identity: a bevel read from the shape itself, a soft drop shadow, glass gloss, and the four-point glint.
// Coordinates are unit space: x, y in -1..1 across the tile, y down. Angles are degrees, clockwise from +x (screen space).
const fs = require('fs');
const path = require('path');

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const mixc = (c1, c2, t) => [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t)];
const RAD = Math.PI / 180;

const FONT = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'fonts', 'glyph-outlines.json'), 'utf8'));

// ------------------------------------------------------------------------------------------------ the glyph canvas (three tone layers)
class Glyph {
  constructor(N) { this.N = N; this.k = N / 2; this.m = new Float32Array(N * N); this.a = new Float32Array(N * N); this.d = new Float32Array(N * N); }
  put(i, c, t) {
    const { m, a, d } = this;
    if (t === 'c') { m[i] *= 1 - c; a[i] *= 1 - c; d[i] *= 1 - c; return; }
    const L = t === 'a' ? a : t === 'd' ? d : m, o = 1 - c;
    if (L !== m) m[i] *= o; if (L !== a) a[i] *= o; if (L !== d) d[i] *= o;
    L[i] = L[i] * o + c;
  }
  /** Rasterise sdf(u, v) -> distance in unit space, inside the unit-space box. */
  shape(x0, y0, x1, y1, sdf, t) {
    const N = this.N, k = this.k, p = 2 / k;
    const ix0 = Math.max(0, Math.floor((x0 - p + 1) * k)), ix1 = Math.min(N - 1, Math.ceil((x1 + p + 1) * k));
    const iy0 = Math.max(0, Math.floor((y0 - p + 1) * k)), iy1 = Math.min(N - 1, Math.ceil((y1 + p + 1) * k));
    for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) {
      const c = 0.5 - sdf((x + 0.5) / k - 1, (y + 0.5) / k - 1) * k;
      if (c > 0) this.put(y * N + x, c > 1 ? 1 : c, t || 'm');
    }
    return this;
  }
  disc(x, y, r, t) { return this.shape(x - r, y - r, x + r, y + r, (u, v) => Math.hypot(u - x, v - y) - r, t); }
  ring(x, y, r, w, t) { const R = r + w / 2; return this.shape(x - R, y - R, x + R, y + R, (u, v) => Math.abs(Math.hypot(u - x, v - y) - r) - w / 2, t); }
  ell(x, y, rx, ry, t, rot) {
    const c = Math.cos((rot || 0) * RAD), s = Math.sin((rot || 0) * RAD), R = Math.max(rx, ry), m = Math.min(rx, ry);
    return this.shape(x - R, y - R, x + R, y + R, (u, v) => { const px = u - x, py = v - y, qx = px * c + py * s, qy = -px * s + py * c; return (Math.hypot(qx / rx, qy / ry) - 1) * m; }, t);
  }
  /** Rounded rectangle, half sizes hw and hh, corner radius r, optional rotation. */
  rr(x, y, hw, hh, r, t, rot) {
    const c = Math.cos((rot || 0) * RAD), s = Math.sin((rot || 0) * RAD), R = Math.hypot(hw, hh);
    r = Math.min(r, hw, hh);
    return this.shape(x - R, y - R, x + R, y + R, (u, v) => {
      const px = u - x, py = v - y, qx = Math.abs(px * c + py * s) - (hw - r), qy = Math.abs(-px * s + py * c) - (hh - r);
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
    }, t);
  }
  /** A rounded-rectangle outline. */
  rrs(x, y, hw, hh, r, w, t, rot) {
    const c = Math.cos((rot || 0) * RAD), s = Math.sin((rot || 0) * RAD), R = Math.hypot(hw, hh) + w; r = Math.min(r, hw, hh);
    return this.shape(x - R, y - R, x + R, y + R, (u, v) => {
      const px = u - x, py = v - y, qx = Math.abs(px * c + py * s) - (hw - r), qy = Math.abs(-px * s + py * c) - (hh - r);
      return Math.abs(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r) - w / 2;
    }, t);
  }
  /** Capsule from (x1,y1) to (x2,y2) of width w. */
  ln(x1, y1, x2, y2, w, t) {
    const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1e-9, h = w / 2;
    return this.shape(Math.min(x1, x2) - h, Math.min(y1, y2) - h, Math.max(x1, x2) + h, Math.max(y1, y2) + h, (u, v) => {
      const q = clamp(((u - x1) * dx + (v - y1) * dy) / L2, 0, 1); return Math.hypot(u - x1 - q * dx, v - y1 - q * dy) - h;
    }, t);
  }
  /** Polyline stroke with round joins and caps; closed joins the ends. */
  pl(pts, w, t, closed) {
    const n = closed ? pts.length : pts.length - 1, h = w / 2;
    let x0 = 9, y0 = 9, x1 = -9, y1 = -9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return this.shape(x0 - h, y0 - h, x1 + h, y1 + h, (u, v) => {
      let best = 9;
      for (let i = 0; i < n; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
        const q = clamp(((u - ax) * dx + (v - ay) * dy) / L2, 0, 1), dd = Math.hypot(u - ax - q * dx, v - ay - q * dy); if (dd < best) best = dd;
      }
      return best - h;
    }, t);
  }
  /** Quadratic Bezier stroke. */
  bez(p0, p1, p2, w, t, closed) { const pts = []; for (let i = 0; i <= 28; i++) { const s = i / 28, o = 1 - s; pts.push([o * o * p0[0] + 2 * o * s * p1[0] + s * s * p2[0], o * o * p0[1] + 2 * o * s * p1[1] + s * s * p2[1]]); } return this.pl(pts, w, t, closed); }
  /** Cubic Bezier as a list of points (for filled outlines or strokes). */
  cub(p0, p1, p2, p3, n) { const pts = []; n = n || 24; for (let i = 0; i <= n; i++) { const s = i / n, o = 1 - s; pts.push([o * o * o * p0[0] + 3 * o * o * s * p1[0] + 3 * o * s * s * p2[0] + s * s * s * p3[0], o * o * o * p0[1] + 3 * o * o * s * p1[1] + 3 * o * s * s * p2[1] + s * s * s * p3[1]]); } return pts; }
  /** Arc of a circle from angle a0 to a1 (clockwise on screen), stroke width w, round caps. */
  arc(x, y, r, a0, a1, w, t) {
    const R = r + w / 2, h = w / 2, span = ((a1 - a0) % 360 + 360) % 360 || 360;
    const ex = [x + r * Math.cos(a0 * RAD), y + r * Math.sin(a0 * RAD)], ey = [x + r * Math.cos(a1 * RAD), y + r * Math.sin(a1 * RAD)];
    return this.shape(x - R, y - R, x + R, y + R, (u, v) => {
      const ang = ((Math.atan2(v - y, u - x) / RAD - a0) % 360 + 360) % 360;
      if (ang <= span) return Math.abs(Math.hypot(u - x, v - y) - r) - h;
      return Math.min(Math.hypot(u - ex[0], v - ex[1]), Math.hypot(u - ey[0], v - ey[1])) - h;
    }, t);
  }
  /** Filled polygon. */
  poly(pts, t, grow) {
    let x0 = 9, y0 = 9, x1 = -9, y1 = -9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const n = pts.length, g = grow || 0;
    return this.shape(x0 - g, y0 - g, x1 + g, y1 + g, (u, v) => {
      let dmin = 1e9, sgn = 1;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [ax, ay] = pts[j], [bx, by] = pts[i], ex = bx - ax, ey = by - ay, wx = u - ax, wy = v - ay, q = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey || 1e-9), 0, 1);
        const dx = wx - ex * q, dy = wy - ey * q, dd = dx * dx + dy * dy; if (dd < dmin) dmin = dd;
        if ((ay <= v && by > v && ex * wy > ey * wx) || (ay > v && by <= v && ex * wy < ey * wx)) sgn = -sgn;
      }
      return sgn * Math.sqrt(dmin) - g;
    }, t);
  }
  /** Four-point star with concave sides. */
  star(x, y, r, t, rot) {
    const c = Math.cos((rot || 0) * RAD), s = Math.sin((rot || 0) * RAD), R = r * 1.5;
    return this.shape(x - R, y - R, x + R, y + R, (u, v) => {
      const px = u - x, py = v - y, ax = Math.abs(px * c + py * s), ay = Math.abs(-px * s + py * c);
      return Math.max(Math.max(ax, ay) - r, -(Math.hypot(ax - r, ay - r) - r));
    }, t);
  }
  /** Crescent: a disc of radius r with a disc of radius r*ir bitten out, offset by off along rot. */
  moon(x, y, r, t, rot, off, ir) {
    const c = Math.cos((rot || 0) * RAD), s = Math.sin((rot || 0) * RAD); off = off == null ? 0.42 * r : off; ir = ir == null ? 0.86 * r : ir;
    return this.shape(x - r, y - r, x + r, y + r, (u, v) => {
      const px = u - x, py = v - y, qx = px * c + py * s, qy = -px * s + py * c;
      return Math.max(Math.hypot(px, py) - r, -(Math.hypot(qx - off, qy) - ir));
    }, t);
  }
  /** Heart, width about 2s, centred on (x, y). */
  heart(x, y, s, t) {
    return this.shape(x - s, y - s, x + s, y + s, (u, v) => {
      let px = Math.abs(u - x) / (s * 1.02), py = -(v - y) / (s * 1.02) + 0.5;
      let d;
      if (py + px > 1) d = Math.hypot(px - 0.25, py - 0.75) - Math.SQRT2 / 4;
      else { const a = Math.hypot(px, py - 1), m = 0.5 * Math.max(px + py, 0), b = Math.hypot(px - m, py - m); d = Math.min(a, b) * Math.sign(px - py); }
      return d * s * 1.02;
    }, t);
  }
  /** Text set in Vigil Sans Bold. em is the font size in unit space; align is 'l', 'c' or 'r'; y is the baseline. */
  text(str, x, y, em, t, align) {
    const k = em / FONT.unitsPerEm; let w = 0; for (const ch of str) w += (FONT.glyphs[ch] ? FONT.glyphs[ch].adv : 500);
    let cx = align === 'l' ? x : align === 'r' ? x - w * k : x - (w * k) / 2;
    const N = this.N, kk = this.k, SS = 4;
    for (const ch of str) {
      const G = FONT.glyphs[ch]; if (!G) { cx += 500 * k; continue; }
      if (G.contours.length) {
        const polys = G.contours.map((c) => c.map(([px, py]) => [(cx + px * k + 1) * kk, (y - py * k + 1) * kk]));
        let mnY = 1e9, mxY = -1e9, mnX = 1e9, mxX = -1e9; for (const p of polys) for (const [px, py] of p) { mnY = Math.min(mnY, py); mxY = Math.max(mxY, py); mnX = Math.min(mnX, px); mxX = Math.max(mxX, px); }
        const y0 = Math.max(0, Math.floor(mnY)), y1 = Math.min(N - 1, Math.ceil(mxY)), x0 = Math.max(0, Math.floor(mnX)), x1 = Math.min(N - 1, Math.ceil(mxX));
        const W = x1 - x0 + 1, acc = new Float32Array(W * (y1 - y0 + 1));
        for (let py = y0; py <= y1; py++) for (let s = 0; s < SS; s++) {
          const sy = py + (s + 0.5) / SS, xs = [];
          for (const p of polys) for (let i = 0; i < p.length; i++) { const [ax, ay] = p[i], [bx, by] = p[(i + 1) % p.length]; if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push([ax + ((sy - ay) / (by - ay)) * (bx - ax), by > ay ? 1 : -1]); }
          xs.sort((p, q) => p[0] - q[0]);
          let wind = 0;
          for (let i = 0; i < xs.length - 1; i++) {
            wind += xs[i][1];
            if (wind !== 0) { const xa = clamp(xs[i][0], x0, x1 + 1), xb = clamp(xs[i + 1][0], x0, x1 + 1); for (let px = Math.floor(xa); px < Math.ceil(xb); px++) acc[(py - y0) * W + px - x0] += (Math.min(px + 1, xb) - Math.max(px, xa)) / SS; }
          }
        }
        for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) { const c = clamp(acc[(py - y0) * W + px - x0], 0, 1); if (c > 0.002) this.put(py * N + px, c, t || 'm'); }
      }
      cx += G.adv * k;
    }
    return this;
  }
}

// ------------------------------------------------------------------------------------------------ helpers for compositing
function boxBlur(src, N, r) {
  r = Math.max(1, Math.round(r));
  let a = src, b = new Float32Array(N * N);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < N; y++) { // horizontal
      let s = 0; const row = y * N, inv = 1 / (2 * r + 1);
      for (let x = -r; x <= r; x++) s += a[row + clamp(x, 0, N - 1)];
      for (let x = 0; x < N; x++) { b[row + x] = s * inv; s += a[row + Math.min(N - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; }
    }
    const c = new Float32Array(N * N);
    for (let x = 0; x < N; x++) { // vertical
      let s = 0; const inv = 1 / (2 * r + 1);
      for (let y = -r; y <= r; y++) s += b[clamp(y, 0, N - 1) * N + x];
      for (let y = 0; y < N; y++) { c[y * N + x] = s * inv; s += b[Math.min(N - 1, y + r + 1) * N + x] - b[Math.max(0, y - r) * N + x]; }
    }
    a = c;
  }
  return a;
}

// ------------------------------------------------------------------------------------------------ tile palettes
const BG = {
  // Rose: the pink tile with white glyphs
  rose:    { top: hex('#ff5c8f'), mid: hex('#ff0058'), bot: hex('#a80039'), glow: hex('#ff9fbd') },
  deep:    { top: hex('#e8206b'), mid: hex('#c4004a'), bot: hex('#6e0029'), glow: hex('#ff7aa5') },
  wine:    { top: hex('#a8184f'), mid: hex('#7a0030'), bot: hex('#3d0016'), glow: hex('#ff5c8f') },
  magenta: { top: hex('#ff3d9a'), mid: hex('#d4006f'), bot: hex('#7a0048'), glow: hex('#ff9fd0') },
  plum:    { top: hex('#8a2a66'), mid: hex('#5a1244'), bot: hex('#2a0820'), glow: hex('#ff5c9f') },
  blush:   { top: hex('#ff9fbd'), mid: hex('#ff4d85'), bot: hex('#d4004f'), glow: hex('#ffd0e0') },
};
const NIGHT = {
  rose:    { top: hex('#5a1038'), mid: hex('#2e0a20'), bot: hex('#16050f'), glow: hex('#ff0058') },
  deep:    { top: hex('#4a0f2e'), mid: hex('#26081a'), bot: hex('#12040c'), glow: hex('#e8206b') },
  wine:    { top: hex('#4a0a24'), mid: hex('#2a0613'), bot: hex('#12030a'), glow: hex('#c4004a') },
  magenta: { top: hex('#4a1040'), mid: hex('#280a26'), bot: hex('#13050f'), glow: hex('#d4006f') },
  plum:    { top: hex('#33143a'), mid: hex('#1c0a22'), bot: hex('#0d050f'), glow: hex('#a8184f') },
  blush:   { top: hex('#5a1a3a'), mid: hex('#341028'), bot: hex('#180812'), glow: hex('#ff6a9b') },
};

/** Draw one pointed (lancet) arch outline into a float mask value at (u, v): 1 on the line. */
function archLine(u, v, cx, baseY, w, thick) {
  if (v > baseY) return 0;
  const d = u >= cx ? Math.abs(Math.hypot(u - (cx - w), v - baseY) - 2 * w) : Math.abs(Math.hypot(u - (cx + w), v - baseY) - 2 * w);
  return clamp(1 - d / thick, 0, 1);
}

/**
 * Render one icon. def.draw(g) paints the glyph; variant is 'rose' or 'night'; N is the pixel size (1024 for masters).
 * Returns { w, h, d: Float32Array RGBA } opaque, full-bleed (iOS applies its own corner mask).
 */
function renderIcon(def, variant, N) {
  N = N || 1024;
  const g = new Glyph(N);
  def.draw(g);
  const night = variant === 'night', pal = (night ? NIGHT : BG)[def.bg || 'rose'];
  const n2 = N * N, k = N / 2;
  const F = new Float32Array(n2), Fs = new Float32Array(n2);
  for (let i = 0; i < n2; i++) { F[i] = Math.max(g.m[i], g.a[i], g.d[i]); Fs[i] = Math.max(g.m[i], g.a[i], g.d[i] * 0.4); }
  const bevel = boxBlur(F, N, N * 0.0065), shadow = boxBlur(Fs, N, N * 0.016), glow = night ? boxBlur(g.m, N, N * 0.05) : null;
  const so = Math.round(N * 0.014);
  const out = new Float32Array(n2 * 4);
  const G = {   // glyph tone colours
    mTop: night ? hex('#ffb3cc') : [1, 1, 1], mBot: night ? hex('#ff2a74') : hex('#ffd6e4'),
    hi: night ? hex('#fff0f5') : [1, 1, 1], lo: night ? hex('#8a0033') : hex('#e0507d'),
    a: night ? hex('#fff4f8') : hex('#5c0019'), aLo: night ? hex('#e07a9c') : hex('#2e000c'),
    d: night ? hex('#ff2a74') : [1, 1, 1], dA: night ? 0.45 : 0.42,
    sh: night ? [0.03, 0, 0.02] : hex('#43001a'), shA: night ? 0.7 : 0.42,
  };
  const glintX = 0.66, glintY = -0.66, glintR = 0.085;
  for (let y = 0; y < N; y++) {
    const v = (y + 0.5) / k - 1, ty = y / (N - 1);
    for (let x = 0; x < N; x++) {
      const u = (x + 0.5) / k - 1, i = y * N + x;
      // ---- tile: three-stop gradient, light from upper left, glow rising from the bottom
      const tt = clamp(ty * 0.9 + (u + 1) * 0.05, 0, 1);
      let c = tt < 0.55 ? mixc(pal.top, pal.mid, tt / 0.55) : mixc(pal.mid, pal.bot, (tt - 0.55) / 0.45);
      c = mixc(c, pal.glow, (night ? 0.34 : 0.2) * Math.exp(-(Math.pow(u * 0.9, 2) + Math.pow((v - 1.1) * 0.8, 2)) / 0.35));
      c = mixc(c, night ? pal.glow : [1, 1, 1], (night ? 0.12 : 0.2) * Math.exp(-(Math.pow(u + 0.55, 2) + Math.pow(v + 0.75, 2)) / 0.28));
      // ---- gothic: two nested lancet arches rising from the bottom, drawn as faint lit lines
      const al = Math.max(archLine(u, v, 0, 1.22, 0.62, 0.012), archLine(u, v, 0, 1.22, 0.4, 0.01) * 0.7);
      if (al > 0) c = mixc(c, night ? pal.glow : [1, 1, 1], al * (night ? 0.3 : 0.13));
      // ---- shadow, glow
      const sh = (y - so >= 0 ? shadow[(y - so) * N + x] : 0) * (1 - F[i] * 0.0);
      if (sh > 0) c = mixc(c, G.sh, sh * G.shA);
      if (glow) c = mixc(c, hex('#ff0058'), clamp(glow[i] * 0.9, 0, 0.6));
      // ---- glyph layers with bevel from the blurred silhouette
      if (F[i] > 0.002) {
        const xl = bevel[y * N + Math.max(0, x - 1)], xr = bevel[y * N + Math.min(N - 1, x + 1)], yu = bevel[Math.max(0, y - 1) * N + x], yd = bevel[Math.min(N - 1, y + 1) * N + x];
        const s = clamp(((xr - xl) + (yd - yu)) * 2.4 * (N / 1024 + 0.0), -1, 1);
        const am = g.m[i], aa = g.a[i], ad = g.d[i];
        if (ad > 0) c = mixc(c, G.d, ad * G.dA);
        if (am > 0) {
          let m = mixc(G.mTop, G.mBot, clamp((ty - 0.25) / 0.55, 0, 1));
          m = s > 0 ? mixc(m, G.hi, s * 0.8) : mixc(m, G.lo, -s * 0.55);
          c = mixc(c, m, am);
        }
        if (aa > 0) {
          let m = mixc(G.a, G.aLo, clamp((ty - 0.25) / 0.55, 0, 1));
          m = s > 0 ? mixc(m, night ? [1, 1, 1] : hex('#a8184f'), s * 0.55) : mixc(m, night ? G.lo : [0.1, 0, 0.03], -s * 0.5);
          c = mixc(c, m, aa);
        }
      }
      // ---- glass: a soft arc of light across the upper third, and a gentle floor
      const gl = smooth(0.5, 0.0, ty + (u * u) * 0.22 - 0.04) * (night ? 0.07 : 0.15);
      if (gl > 0) c = mixc(c, [1, 1, 1], gl);
      c = mixc(c, [0, 0, 0], smooth(0.86, 1, ty) * (night ? 0.3 : 0.16));
      // ---- the glint (the guiding star from the VigilTech mark), upper right
      const gx = u - glintX, gy = v - glintY, ax = Math.abs(gx), ay = Math.abs(gy);
      const sd = Math.max(Math.max(ax, ay) - glintR, -(Math.hypot(ax - glintR, ay - glintR) - glintR));
      const sc = clamp(0.5 - sd * k, 0, 1);
      c = mixc(c, [1, 1, 1], 0.55 * Math.exp(-(gx * gx + gy * gy) / 0.006));
      if (sc > 0) c = mixc(c, night ? hex('#ffe3ee') : [1, 1, 1], sc * 0.95);
      const o = i * 4; out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 1;
    }
  }
  const cv = { w: N, h: N, d: out };
  cv.toRGBA = (dither) => {
    const o = new Uint8Array(n2 * 4);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4, nz = dither ? (((x * 7 + y * 13) & 15) / 15 - 0.5) / 255 : 0;
      for (let q = 0; q < 3; q++) o[i + q] = clamp(Math.round((out[i + q] + nz) * 255), 0, 255);
      o[i + 3] = 255;
    }
    return o;
  };
  return cv;
}

/** Area-average downscale of a canvas-like { w, h, d } by an integer factor. */
function downscale(cv, f) {
  const w = cv.w / f, h = cv.h / f, d = new Float32Array(w * h * 4), q = 1 / (f * f);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let yy = 0; yy < f; yy++) for (let xx = 0; xx < f; xx++) { const i = ((y * f + yy) * cv.w + x * f + xx) * 4; r += cv.d[i]; g += cv.d[i + 1]; b += cv.d[i + 2]; a += cv.d[i + 3]; }
    const o = (y * w + x) * 4; d[o] = r * q; d[o + 1] = g * q; d[o + 2] = b * q; d[o + 3] = a * q;
  }
  const out = { w, h, d };
  out.toRGBA = () => { const o = new Uint8Array(w * h * 4); for (let i = 0; i < w * h * 4; i++) o[i] = clamp(Math.round(d[i] * 255), 0, 255); return o; };
  return out;
}

module.exports = { Glyph, renderIcon, downscale, boxBlur, BG, NIGHT, clamp, mix, mixc, smooth, hex, RAD, FONT };
