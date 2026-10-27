'use strict';
const fs = require('fs'); const PNG = require('../sprite/png.js'); const { DESK } = require('./desk.js');
const names = Object.keys(DESK), w = 480, h = 300, pad = 8, W = w * 2 + pad * 3, H = (h + pad) * names.length * 1 + pad, out = new Uint8Array(W * H * 4).fill(20);
let row = 0; for (const n of names) { ['night', 'dawn'].forEach((v, k) => { const r = DESK[n](w, h, v).toRGBA(); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = (y * w + x) * 4, o = ((y + pad + row * (h + pad)) * W + pad + k * (w + pad) + x) * 4; for (let c = 0; c < 4; c++) out[o + c] = r[s + c]; } }); row++; }
fs.writeFileSync('/private/tmp/claude-501/desk.png', Buffer.from(PNG.encode(W, H, out)));
