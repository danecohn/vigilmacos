'use strict';
// Folder icons: a two-panel folder, lit like the rest of the kit, with a glyph set into the front.
const { Glyph, boxBlur, clamp, mixc, smooth, hex } = require('./engine.js');
const apple = require('./apple.js'), system = require('./system.js');
const pick = (l, id) => l.find((d) => d.id === id).draw;
const D = [];
const F = (id, name, draw) => D.push({ id, name, draw });
F('folder', 'Folder', null);
F('documents', 'Documents', pick(apple, 'notes'));
F('downloads', 'Downloads', (g) => { g.poly([[-0.14, -0.5], [0.14, -0.5], [0.14, -0.06], [0.3, -0.06], [0, 0.3], [-0.3, -0.06], [-0.14, -0.06]], 'm'); g.rr(0, 0.5, 0.34, 0.06, 0.03, 'm'); });
F('desktop', 'Desktop', (g) => { g.rr(0, -0.06, 0.52, 0.34, 0.06, 'm'); g.ln(0, 0.28, 0, 0.44, 0.08, 'm'); g.ln(-0.22, 0.5, 0.22, 0.5, 0.08, 'm'); });
F('applications', 'Applications', pick(apple, 'appstore'));
F('pictures', 'Pictures', pick(apple, 'preview'));
F('music', 'Music', pick(apple, 'music'));
F('movies', 'Movies', (g) => { g.rr(0, 0.04, 0.54, 0.4, 0.06, 'm'); g.poly([[-0.1, -0.12], [0.24, 0.04], [-0.1, 0.2]], 'c'); g.rr(0, -0.4, 0.54, 0.08, 0.02, 'a', -6); });
F('home', 'Home', pick(apple, 'home'));
F('developer', 'Developer', pick(apple, 'developer'));
F('games', 'Games', pick(apple, 'games'));
F('projects', 'Projects', (g) => { g.star(-0.1, 0.04, 0.46, 'm'); g.star(0.4, -0.4, 0.14, 'a'); });
F('archive', 'Archive', (g) => { g.rr(0, -0.3, 0.56, 0.12, 0.03, 'm'); g.rr(0, 0.12, 0.5, 0.4, 0.05, 'm'); g.rr(0, 0.0, 0.14, 0.05, 0.02, 'c'); });
F('shared', 'Shared', (g) => { g.disc(-0.24, -0.2, 0.15, 'm'); g.ell(-0.24, 0.3, 0.3, 0.2, 'm'); g.disc(0.26, -0.14, 0.17, 'a'); g.ell(0.26, 0.4, 0.3, 0.2, 'a'); });
F('private', 'Private', (g) => { g.rr(0, 0.18, 0.4, 0.34, 0.08, 'm'); g.arc(0, -0.16, 0.24, 180, 360, 0.11, 'm'); g.disc(0, 0.18, 0.08, 'c'); });
F('backups', 'Backups', pick(system, 'timemachine'));
F('library', 'Library', pick(apple, 'books'));
F('work', 'Work', (g) => { g.rr(0, 0.1, 0.56, 0.4, 0.08, 'm'); g.arc(0, -0.3, 0.2, 180, 360, 0.09, 'm'); g.ln(-0.56, 0.1, 0.56, 0.1, 0.05, 'c'); g.rr(0, 0.1, 0.08, 0.06, 0.02, 'a'); });

const sdRR = (px, py, hx, hy, r) => { const qx = Math.abs(px) - (hx - r), qy = Math.abs(py) - (hy - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
const PAL = {
  rose: { backTop: hex('#d4004f'), backBot: hex('#8a0035'), frontTop: hex('#ff6a9b'), frontMid: hex('#ff0058'), frontBot: hex('#c4004a'), edge: hex('#ffd0e0'), glyph: [1, 0.96, 0.98], glyphA: hex('#5c0019'), shade: hex('#7a0030') },
  night: { backTop: hex('#3a0f2a'), backBot: hex('#1c0714'), frontTop: hex('#6a1a45'), frontMid: hex('#3d0f2c'), frontBot: hex('#25091b'), edge: hex('#ff6a9b'), glyph: hex('#ff8fb3'), glyphA: hex('#fff0f5'), shade: hex('#12040c') },
};
/** Returns { w, h, d } RGBA float (transparent background). */
function renderFolder(def, variant, N) {
  const pal = PAL[variant], k = N / 2, out = new Float32Array(N * N * 4), alpha = new Float32Array(N * N);
  let gm = null, ga = null;
  if (def.draw) { const g = new Glyph(N); def.draw(g); gm = g; }
  const cy = 0.06;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x + 0.5) / k - 1, v = (y + 0.5) / k - 1, i = (y * N + x) * 4;
    const dBack = Math.min(sdRR(u, v - (cy - 0.06), 0.86, 0.62, 0.12), sdRR(u + 0.5, v - (cy - 0.7), 0.36, 0.14, 0.08)), dFront = sdRR(u, v - (cy + 0.1), 0.86, 0.52, 0.12);
    const cb = clamp(0.5 - dBack * k, 0, 1), cf = clamp(0.5 - dFront * k, 0, 1);
    let c = [0, 0, 0], a = 0;
    if (cb > 0) { c = mixc(pal.backTop, pal.backBot, clamp((v + 0.7) / 1.3, 0, 1)); a = cb; }
    if (cf > 0) {
      const t = clamp((v - (cy - 0.42)) / 1.04, 0, 1); let f = t < 0.45 ? mixc(pal.frontTop, pal.frontMid, t / 0.45) : mixc(pal.frontMid, pal.frontBot, (t - 0.45) / 0.55);
      f = mixc(f, pal.edge, 0.7 * (1 - smooth(0, 3.5 / k, -dFront)) * smooth(0.0, 1, 1 - t * 1.4));      // lit top rim
      f = mixc(f, [0, 0, 0], 0.18 * (1 - smooth(0, 3 / k, -dFront)) * smooth(0.5, 1, t));                  // darker bottom rim
      c = mixc(c, f, cf); a = a + cf * (1 - a);
    }
    out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = a; alpha[y * N + x] = a;
  }
  // glyph, set into the front panel (scaled 0.52, centred on the panel)
  if (gm) {
    const S = 0.52, ox = 0, oy = cy + 0.14, F = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) F[i] = Math.max(gm.m[i], gm.a[i], gm.d[i]);
    const samp = (arr, u, v) => { const gx = ((u - ox) / S + 1) * k - 0.5, gy = ((v - oy) / S + 1) * k - 0.5, x0 = Math.floor(gx), y0 = Math.floor(gy); if (x0 < 0 || y0 < 0 || x0 >= N - 1 || y0 >= N - 1) return 0; const fx = gx - x0, fy = gy - y0, p = y0 * N + x0; return (arr[p] * (1 - fx) + arr[p + 1] * fx) * (1 - fy) + (arr[p + N] * (1 - fx) + arr[p + N + 1] * fx) * fy; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = (x + 0.5) / k - 1, v = (y + 0.5) / k - 1, i = (y * N + x) * 4, f = samp(F, u, v), fs = samp(F, u, v - 0.012);
      if (out[i + 3] <= 0) continue;
      const m = samp(gm.m, u, v), a = samp(gm.a, u, v), d = samp(gm.d, u, v);
      // a soft shadow under the glyph, then the glyph itself with a lit upper edge
      const sh = clamp(samp(F, u, v - 0.014) - f * 0.0, 0, 1) * 0.35; let c = [out[i], out[i + 1], out[i + 2]];
      c = mixc(c, pal.shade, sh * (1 - f));
      const lit = clamp((samp(F, u, v + 0.006) - samp(F, u, v - 0.006)) * 14, -1, 1);
      if (d > 0) c = mixc(c, pal.glyph, d * 0.4);
      if (m > 0) c = mixc(c, lit > 0 ? mixc(pal.glyph, [1, 1, 1], lit * 0.5) : mixc(pal.glyph, pal.shade, -lit * 0.3), m);
      if (a > 0) c = mixc(c, pal.glyphA, a);
      out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2];
    }
  }
  // drop shadow
  const sh = boxBlur(alpha, N, N * 0.014), dy = Math.round(N * 0.018);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = (y * N + x) * 4, s = (y - dy >= 0 ? sh[(y - dy) * N + x] : 0) * 0.38, A = out[i + 3]; if (s <= 0.002) continue; const oa = A + s * (1 - A); out[i] = (out[i] * A + 0.08 * s * (1 - A)) / oa; out[i + 1] = (out[i + 1] * A + 0.0 * s * (1 - A)) / oa; out[i + 2] = (out[i + 2] * A + 0.03 * s * (1 - A)) / oa; out[i + 3] = oa; }
  return require('./platform.js').toCanvas(N, N, out);
}
module.exports = { FOLDERS: D, renderFolder };
