import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const manifest = JSON.parse(fs.readFileSync('dist/.vite/manifest.json', 'utf8')),
  seen = new Set();
function initial(key) {
  if (seen.has(key)) return 0;
  seen.add(key);
  const item = manifest[key];
  if (!item) throw new Error(`Missing manifest entry ${key}`);
  return (
    zlib.gzipSync(fs.readFileSync(path.join('dist', item.file))).length +
    (item.imports || []).reduce((sum, key) => sum + initial(key), 0)
  );
}
const startup = Object.entries(manifest)
  .filter(([, v]) => v.isEntry)
  .reduce((sum, [key]) => sum + initial(key), 0);
function size(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .reduce(
      (sum, e) =>
        sum +
        (e.isDirectory() ? size(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size),
      0,
    );
}
const total = size('dist');
console.log(
  `Startup JS gzip: ${(startup / 1024).toFixed(1)} KiB / 300 KiB; offline bundle: ${(total / 1024).toFixed(1)} KiB / 8192 KiB`,
);
if (startup > 300 * 1024 || total > 8 * 1024 * 1024) process.exit(1);
