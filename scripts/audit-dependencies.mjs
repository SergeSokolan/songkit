import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const registry = 'https://registry.npmjs.org';
// These advisories affect build/test globbing. The published app does not process glob input.
// Revisit when upstream publishes compatible patched releases.
const reviewedBuildAdvisories = new Set([
  'https://github.com/advisories/GHSA-3g3m-2fjr-6pw4',
  'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',
  'https://github.com/advisories/GHSA-g3hv-75wg-m249',
]);

function audit(...options) {
  const args = ['audit', '--package-lock-only', '--json', `--registry=${registry}`, ...options];
  const subprocessOptions = { encoding: 'utf8', timeout: 60_000 };
  // npm is a command shim on Windows. Every argument here is a fixed string.
  const result =
    process.platform === 'win32'
      ? spawnSync(`npm ${args.join(' ')}`, { ...subprocessOptions, shell: true })
      : spawnSync('npm', args, subprocessOptions);
  if (result.status !== 0 && result.status !== 1) throw new Error('npm audit did not complete');
  const report = JSON.parse(result.stdout);
  if (report.error || !report.vulnerabilities || !report.metadata?.vulnerabilities) {
    throw new Error('npm audit did not return a vulnerability report');
  }
  return report;
}

try {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path) continue;
    if (
      !entry.resolved?.startsWith(`${registry}/`) ||
      !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(entry.integrity ?? '')
    ) {
      throw new Error(`Unapproved source or missing integrity for ${JSON.stringify(path)}`);
    }
  }

  const runtime = audit('--omit=dev');
  if (runtime.metadata.vulnerabilities.total !== 0) {
    throw new Error('Runtime audit found vulnerabilities. Run npm audit --omit=dev for details');
  }

  const full = audit('--include=dev');
  const advisories = new Set(
    Object.values(full.vulnerabilities).flatMap(({ via }) =>
      via.filter((entry) => typeof entry === 'object').map(({ url }) => url),
    ),
  );
  if (
    full.metadata.vulnerabilities.critical > 0 ||
    (full.metadata.vulnerabilities.total > 0 && advisories.size === 0) ||
    [...advisories].some((url) => !reviewedBuildAdvisories.has(url))
  ) {
    throw new Error('Build audit requires review. Run npm audit for details');
  }
  console.log(`[security] Runtime: 0 findings. Reviewed build advisories: ${advisories.size}.`);
} catch (error) {
  console.error(`[security] ${error.message}`);
  process.exitCode = 1;
}
