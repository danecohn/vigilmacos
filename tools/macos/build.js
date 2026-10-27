'use strict';
// Builds the whole VigilTech macOS kit.  node tools/macos/build.js [icons|folders|wallpapers|avatars|sounds]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { renderIcon } = require('./engine.js');
const PL = require('./platform.js');
const { FOLDERS, renderFolder } = require('./folders.js');
const { DESK } = require('./desk.js');
const apple = require('./apple.js'), apps = require('./apps.js'), system = require('./system.js'), vigil = require('./vigil.js');
const ROOT = path.join(__dirname, '..', '..');
const put = (rel, buf) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.from(buf)); };
const want = process.argv[2];
const run = (k) => !want || want === k;

if (run('icons')) {
  const all = [].concat(system, apple.map((d) => ({ ...d, group: 'apple' })), apps, vigil.filter((d) => d.group === 'vigiltech'));
  for (const d of all) for (const v of ['rose', 'night']) {
    const big = PL.desktop((n) => renderIcon(d, v, n), 1024);
    put(`icons/${v}/${d.group}/${d.id}.png`, PL.png(PL.resample(big, 512)));
  }
  put('icons.json', JSON.stringify(all.map(({ id, name, group }) => ({ id, name, group })), null, 1));
  console.log('icons', all.length);
}
if (run('folders')) {
  for (const d of FOLDERS) for (const v of ['rose', 'night']) put(`folders/${v}/${d.id}.png`, PL.png(renderFolder(d, v, 1024)));
  put('folders.json', JSON.stringify(FOLDERS.map(({ id, name }) => ({ id, name })), null, 1));
  console.log('folders', FOLDERS.length);
}
if (run('avatars')) {
  const ids = ['vigiltech', 'star', 'rose', 'compline', 'candle', 'dove', 'rosewindow', 'hope'];
  const src = vigil.filter((d) => ids.includes(d.id));
  for (const d of src) for (const v of ['rose', 'night']) { const cv = renderIcon(d, v, 1024); put(`avatars/${d.id}-${v}.png`, PL.png({ w: 512, h: 512, toRGBA: () => PL.resample(cv, 512).toRGBA() })); }
  console.log('avatars', src.length);
}
if (run('wallpapers')) {
  const W = 5120, H = 2880, tmp = path.join(ROOT, '.tmp-wall'); fs.mkdirSync(tmp, { recursive: true });
  for (const n of Object.keys(DESK)) for (const v of ['night', 'dawn']) {
    const png = path.join(tmp, `${n}-${v}.png`), jpg = path.join(ROOT, 'wallpapers', `${n}-${v}.jpg`); fs.mkdirSync(path.dirname(jpg), { recursive: true });
    fs.writeFileSync(png, Buffer.from(require('../sprite/png.js').encode(W, H, DESK[n](W, H, v).toRGBA())));
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '92', png, '--out', jpg], { stdio: 'pipe' }); fs.rmSync(png);
    console.log('wallpaper', n, v);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (run('sounds')) {
  const src = process.env.SOUNDS || path.join(ROOT, 'sounds-src');
  for (const f of fs.readdirSync(src).filter((x) => x.endsWith('.wav') && !x.startsWith('kyrie'))) execFileSync('afconvert', ['-f', 'AIFF', '-d', 'BEI16', path.join(src, f), path.join(ROOT, 'sounds', f.replace('.wav', '.aiff'))]);
  console.log('sounds converted');
}
