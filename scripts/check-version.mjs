import { URL } from 'node:url';
import { docsSourceHash } from './docs-source-hash.mjs';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const readJson = (path) => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const { version } = readJson('package.json');
assert.match(version, /^\d+\.\d+\.\d+(?:-rc\.[1-9]\d*)?$/, 'Use X.Y.Z or X.Y.Z-rc.N');
const lock = readJson('package-lock.json');
assert.equal(lock.version, version, 'Lockfile version differs');
assert.equal(lock.packages[''].version, version, 'Root package version differs');
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
assert.ok(changelog.includes(`## [${version}]`), 'Add this version to CHANGELOG.md');
const screenshots = readJson('docs/screenshots/manifest.json');
assert.equal(screenshots.version, version, 'Refresh documentation screenshots for this version');
assert.equal(screenshots.uiSourceHash, docsSourceHash(), 'UI sources changed: refresh screenshots');
for (const file of screenshots.files) {
  assert.match(file, /^[a-z0-9-]+\.png$/);
  assert.ok(
    existsSync(new URL('../docs/screenshots/' + file, import.meta.url)),
    `Missing screenshot: ${file}`,
  );
}
console.log(`Version ${version}: package, lockfile, changelog and screenshot manifest agree.`);
