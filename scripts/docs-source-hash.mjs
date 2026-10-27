import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { URL, fileURLToPath } from 'node:url';
import path from 'node:path';
export function docsSourceHash() {
  const root = fileURLToPath(new URL('../src/', import.meta.url));
  const files = readdirSync(root, { recursive: true })
    .filter(
      (name) => /\.(tsx?|css)$/.test(name) && !name.includes('.test.') && name !== 'test-setup.ts',
    )
    .sort();
  const hash = createHash('sha256');
  for (const name of files)
    hash.update(
      name.replaceAll('\\', '/') +
        '\n' +
        readFileSync(path.join(root, name), 'utf8').replaceAll('\r\n', '\n'),
    );
  return hash.digest('hex');
}
