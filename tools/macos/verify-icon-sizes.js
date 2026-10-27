'use strict';
// Verify shipped assets, not preview thumbnails. No image transformation or external packages.
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..', '..');
const variants = ['rose', 'night'];
const icons = JSON.parse(fs.readFileSync(path.join(ROOT, 'icons.json'), 'utf8'));
const folders = JSON.parse(fs.readFileSync(path.join(ROOT, 'folders.json'), 'utf8'));
const expected = [
  ...icons.flatMap(d => variants.map(v => `icons/${v}/${d.group}/${d.id}.png`)),
  ...folders.flatMap(d => variants.map(v => `folders/${v}/${d.id}.png`)),
];
const avatars = fs.readdirSync(path.join(ROOT, 'avatars')).filter(f => f.endsWith('.png'));
assert.equal(avatars.length, 16, 'All eight Rose/Night avatar pairs must remain available');
expected.push(...avatars.map(f => `avatars/${f}`));
for (const rel of expected) {
  const b = fs.readFileSync(path.join(ROOT, rel));
  assert.deepEqual([...b.subarray(0, 8)], [137,80,78,71,13,10,26,10], `PNG signature: ${rel}`);
  assert.equal(b.toString('ascii', 12, 16), 'IHDR', `PNG header: ${rel}`);
  assert.equal(b.readUInt32BE(16), 1024, `Width: ${rel}`);
  assert.equal(b.readUInt32BE(20), 1024, `Height: ${rel}`);
  assert.equal(b[24], 8, `8-bit channels: ${rel}`);
  assert.equal(b[25], 6, `RGBA transparency channel: ${rel}`);
}
console.log(`Verified ${icons.length * 2} app icons, ${folders.length * 2} folder icons and ${avatars.length} avatars: all 1024×1024 RGBA PNG.`);
