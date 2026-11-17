import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';

function git(...args) {
  const result = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error('Git could not read the changes.');
  }
  return result.stdout;
}

const sensitivePath =
  /^(?:\.env(?:\..*)?|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?|.*\.(?:pem|p12|pfx|key))$/i;
const examplePath = /^\.env\.(?:example|sample|template)$/i;
const additions = [
  ['Private key', /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/],
  [
    'Recognizable token',
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[A-Z0-9]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{24,})\b/,
  ],
];
const runtimeSink =
  /dangerouslySetInnerHTML\s*[:=]|\.innerHTML\s*\+?=|\b(?:eval|new\s+Function)\s*\(/;
try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !/^[a-f0-9]{40}$/.test(args[0]))) {
    throw new Error('Pass an optional full Git base SHA. With no argument, checks the index.');
  }
  const range = args.length ? [args[0], 'HEAD'] : ['--cached'];
  const paths = git('diff', ...range, '--name-only', '--diff-filter=ACMR', '-z')
    .split('\0')
    .filter(Boolean);
  let failed = false;
  for (const path of paths) {
    if (additions.some(([, pattern]) => pattern.test(path))) {
      console.error('[security] A changed path contains a recognizable credential. Path hidden.');
      failed = true;
      continue;
    }
    const name = basename(path);
    if (sensitivePath.test(name) && !examplePath.test(name)) {
      console.error(`[security] Sensitive filename: ${JSON.stringify(path)}`);
      failed = true;
      continue;
    }
    const change = git(
      '--literal-pathspecs',
      'diff',
      ...range,
      '--no-ext-diff',
      '--no-textconv',
      '--unified=0',
      '--',
      path,
    );
    const flags = new Set();
    let inHunk = false;
    for (const line of change.split('\n')) {
      if (line.startsWith('@@ ')) inHunk = true;
      if (!inHunk || !line.startsWith('+')) continue;
      for (const [label, pattern] of additions) {
        if (pattern.test(line)) flags.add(label);
      }
      if (
        /^src\/.*\.[cm]?[jt]sx?$/.test(path) &&
        !/\.(?:test|spec)\./.test(path) &&
        runtimeSink.test(line)
      ) {
        flags.add('Executable HTML / dynamic code');
      }
    }
    if (flags.size > 0) {
      console.error(`[security] ${JSON.stringify(path)}: ${[...flags].join(', ')}`);
      failed = true;
    }
  }
  if (failed) {
    console.error(
      '[security] Review or remove the flagged changes. Matching values are suppressed.',
    );
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`[security] ${error.message}`);
  process.exitCode = 1;
}
