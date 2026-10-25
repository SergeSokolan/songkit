import fs from 'node:fs';
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const sections = [];
for (const [location, pkg] of Object.entries(lock.packages)) {
  if (!location || (pkg.dev && !location.includes('/workbox-'))) continue;
  const names = fs.readdirSync(location).filter((name) => /^licen[sc]e(?:\.|$)/i.test(name));
  if (!names.length) throw new Error(`Missing license: ${location}`);
  sections.push(
    `${location.replace(/^node_modules\//, '')} ${pkg.version}\n${names.map((name) => fs.readFileSync(`${location}/${name}`, 'utf8')).join('\n')}`,
  );
}
fs.writeFileSync(
  'public/THIRD_PARTY_LICENSES.txt',
  `SongKit runtime dependencies and Workbox\n\n${sections.join('\n\n----------------------------------------\n\n')}`,
);
console.log(`Collected ${sections.length} dependency licenses.`);
