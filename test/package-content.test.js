import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

const repo = process.cwd();
const checkerSource = readFileSync(join(repo, 'scripts/check-package-content.js'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));

function runChecker(t, pkg) {
  const temp = mkdtempSync(join(tmpdir(), 'atomcommit-package-content-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  writeFileSync(join(temp, 'package.json'), JSON.stringify(pkg));
  mkdirSync(join(temp, 'scripts'));
  writeFileSync(join(temp, 'scripts/check-package-content.js'), checkerSource);
  mkdirSync(join(temp, 'src'));
  writeFileSync(join(temp, 'src/index.js'), 'export {};\n');
  const result = spawnSync(process.execPath, [join(temp, 'scripts/check-package-content.js')], { cwd: temp, encoding: 'utf8' });
  return result;
}

test('package content checker accepts declared bin and exports in the npm archive', (t) => {
  const result = runChecker(t, packageJson);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Verified 1 declared package entry point/);
});

test('package content checker rejects a declared entry excluded from the package', (t) => {
  const pkg = { ...packageJson, bin: {}, main: undefined, exports: { '.': './missing-entry.js' } };
  const result = runChecker(t, pkg);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /npm pack is missing declared package entries: missing-entry\.js/);
});

test('package content checker rejects package entry paths outside the package', (t) => {
  const pkg = { ...packageJson, bin: { atomcommit: '../outside.js' }, main: undefined, exports: {} };
  const result = runChecker(t, pkg);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must stay inside the package/);
});
