'use strict';
const fs = require('fs'); const PNG = require('../sprite/png.js'); const PL = require('./platform.js'); const { renderIcon } = require('./engine.js'); const { FOLDERS, renderFolder } = require('./folders.js'); const system = require('./system.js');
const T = 256, cols = 8, items = [];
for (const d of FOLDERS.slice(0, 16)) for (const v of ['rose']) items.push(PL.resample(renderFolder(d, v, 512), T));
for (const d of FOLDERS.slice(0, 8)) items.push(PL.resample(renderFolder(d, 'night', 512), T));
for (const d of system.slice(0, 16)) items.push(PL.desktop((n) => renderIcon(d, 'rose', n), T * 2, { }).constructor && PL.resample(PL.desktop((n) => renderIcon(d, 'rose', n), 512), T));
const rows = Math.ceil(items.length / cols), W = cols * T, H = rows * T, buf = new Uint8Array(W * H * 4); for (let i = 0; i < W * H; i++) { buf[i * 4] = 40; buf[i * 4 + 1] = 28; buf[i * 4 + 2] = 38; buf[i * 4 + 3] = 255; }
items.forEach((cv, n) => { const r = cv.toRGBA(), cx = (n % cols) * T, cy = Math.floor(n / cols) * T; for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const s = (y * T + x) * 4, o = ((cy + y) * W + cx + x) * 4, a = r[s + 3] / 255; for (let c = 0; c < 3; c++) buf[o + c] = Math.round(buf[o + c] * (1 - a) + r[s + c] * a); } });
fs.writeFileSync('/private/tmp/claude-501/mac1.png', Buffer.from(PNG.encode(W, H, buf))); console.log('ok', items.length);
