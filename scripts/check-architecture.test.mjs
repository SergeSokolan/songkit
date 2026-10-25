import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { checkArchitecture } from './check-architecture.mjs';
const fixtures = path.resolve('.tools/architecture-fixtures');
fs.mkdirSync(fixtures, { recursive: true });
function inspect(files) {
  const root = fs.mkdtempSync(path.join(fixtures, 'case-'));
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return checkArchitecture(root).errors.join('\n');
}
test('accepts downward public imports', () =>
  assert.equal(
    inspect({
      'pages/editor/index.ts': "import {p} from '../../entities/pattern'; export {p};",
      'entities/pattern/index.ts': 'export const p=1;',
    }),
    '',
  ));
test('rejects upward imports', () =>
  assert.match(
    inspect({
      'entities/pattern/index.ts': "import '../../features/edit';",
      'features/edit/index.ts': 'export {};',
    }),
    /upward import/,
  ));
test('rejects sibling slices and deep imports', () => {
  assert.match(
    inspect({
      'features/edit/index.ts': "import '../playback';",
      'features/playback/index.ts': 'export {};',
    }),
    /cross-slice/,
  );
  assert.match(
    inspect({
      'pages/editor/index.ts': "import '../../entities/pattern/model/pattern';",
      'entities/pattern/model/pattern.ts': 'export {};',
    }),
    /public API/,
  );
});
test('detects cycles and dynamic imports', () =>
  assert.match(
    inspect({ 'shared/lib/a.ts': "import('./b');", 'shared/lib/b.ts': "export * from './a';" }),
    /Import cycle/,
  ));
test('rejects runtime domain dependencies and unresolved source', () => {
  assert.match(
    inspect({ 'entities/pattern/model.ts': "import * as Tone from 'tone';" }),
    /runtime library/,
  );
  assert.match(inspect({ 'features/edit/index.ts': "import './missing';" }), /unresolved/);
  assert.match(inspect({ 'features/edit/index.ts': "import '@/entities/pattern';" }), /aliases/);
});
