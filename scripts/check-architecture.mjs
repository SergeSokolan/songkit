import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const layers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];
export function checkArchitecture(sourceRoot) {
  const root = path.resolve(sourceRoot);
  const walk = (dir) =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((e) =>
        e.isDirectory()
          ? walk(path.join(dir, e.name))
          : /\.(ts|tsx)$/.test(e.name)
            ? [path.join(dir, e.name)]
            : [],
      );
  const files = walk(root),
    graph = new Map(),
    errors = [];
  function resolveImport(file, specifier) {
    const base = path.resolve(path.dirname(file), specifier);
    return [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      path.join(base, 'index.ts'),
      path.join(base, 'index.tsx'),
    ].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  }
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const imports = [];
    function visit(node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        imports.push(node.moduleSpecifier.text);
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        imports.push(node.arguments[0].text);
      ts.forEachChild(node, visit);
    }
    visit(source);
    const edges = [],
      from = path.relative(root, file).split(path.sep);
    for (const specifier of imports) {
      if (
        from[0] === 'entities' &&
        !/\.test\.tsx?$/.test(file) &&
        /^(react|react-dom|tone|vexflow)(\/|$)/.test(specifier)
      )
        errors.push(`${file}: domain depends on runtime library`);
      if (specifier.startsWith('@/') || specifier.startsWith('~/'))
        errors.push(`${file}: source aliases require architecture resolver support`);
      if (!specifier.startsWith('.')) continue;
      const target = resolveImport(file, specifier);
      if (!target) {
        errors.push(`${file}: unresolved ${specifier}`);
        continue;
      }
      if (!target.startsWith(root + path.sep)) {
        errors.push(`${file}: source import escapes src`);
        continue;
      }
      edges.push(target);
      const to = path.relative(root, target).split(path.sep);
      if (layers.includes(from[0]) && !layers.includes(to[0]))
        errors.push(`${file}: import outside FSD layers`);
      if (layers.indexOf(to[0]) < layers.indexOf(from[0]))
        errors.push(`${file}: upward import ${specifier}`);
      if (from[0] === to[0] && !['app', 'shared'].includes(from[0]) && from[1] !== to[1])
        errors.push(`${file}: cross-slice import ${specifier}`);
      if (
        from[0] !== to[0] &&
        !['app', 'shared'].includes(to[0]) &&
        !(to.length === 3 && /^index\.tsx?$/.test(to[2]))
      )
        errors.push(`${file}: bypasses public API ${specifier}`);
    }
    graph.set(file, edges);
  }
  const visited = new Set(),
    stack = new Set();
  function dfs(file) {
    if (stack.has(file)) {
      errors.push(`Import cycle: ${path.relative(root, file)}`);
      return;
    }
    if (visited.has(file)) return;
    stack.add(file);
    for (const next of graph.get(file) || []) dfs(next);
    stack.delete(file);
    visited.add(file);
  }
  for (const file of files) dfs(file);
  return { files: files.length, errors };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkArchitecture('src');
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else console.log(`FSD: ${result.files} modules, no forbidden imports or cycles.`);
}
