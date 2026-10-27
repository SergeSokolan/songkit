import { readFileSync, writeFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = process.argv[2] || pkg.version;
if (!/^\d+\.\d+\.\d+(?:-rc\.[1-9]\d*)?$/.test(version)) throw new Error('Invalid release version');
const changelog = readFileSync('CHANGELOG.md', 'utf8');
const heading = `## [${version}]`;
const start = changelog.indexOf(heading);
if (start < 0) throw new Error('Missing changelog entry: ' + version);
const next = changelog.indexOf('\n## [', start + heading.length);
const section = changelog
  .slice(start, next < 0 ? changelog.length : next)
  .replace(/\n\[[^\]]+\]:[^\n]*/g, '')
  .trim();
const repo = 'https://github.com/SergeSokolan/songkit';
const notes =
  section +
  `\n\n[Полная история изменений](${repo}/blob/v${version}/CHANGELOG.md) · [Все релизы](${repo}/releases)\n`;
if (process.argv[3]) writeFileSync(process.argv[3], notes);
else process.stdout.write(notes);
