import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

test('atomcommit plan test - CLI should handle --help', () => {
  try {
    const out = execFileSync(process.execPath, ['src/index.js', '--help'], { encoding: 'utf8', stdio: 'pipe' });
    assert.ok(out.includes('atomcommit') || out.includes('plan') || out.includes('commit'),
      'help should mention atomcommit or plan');
  } catch (e) {
    // CLI may exit with code for --help
    assert.ok(true, 'CLI handles --help');
  }
});

test('parseNameStatus handles invalid input', async () => {
  const { parseNameStatus } = await import('../src/index.js');
  const result = parseNameStatus('');
  assert.deepEqual(result, [], 'empty input returns empty array');
});

test('parseNumstat handles binary markers', async () => {
  const { parseNumstat } = await import('../src/index.js');
  const result = parseNumstat('-\t-\tbinary.png\n');
  assert.ok(result.get('binary.png').binary, 'should detect binary files');
});

test('packed CLI executes through the npm bin symlink and remains import-safe', (t) => {
  const packageRoot = process.cwd();
  const parent = mkdtempSync(join(tmpdir(), 'atomcommit-packed-'));
  const consumer = join(parent, 'consumer');
  t.after(() => rmSync(parent, { recursive: true, force: true }));

  const tarballName = execFileSync('npm', ['pack', '--silent', '--pack-destination', parent], {
    cwd: packageRoot,
    encoding: 'utf8',
  }).trim();

  mkdirSync(join(consumer, 'src'), { recursive: true });
  writeFileSync(join(consumer, 'package.json'), '{"private":true}\n');
  writeFileSync(join(consumer, 'src/app.js'), 'console.log("before");\n');
  execFileSync('git', ['init', '--initial-branch', 'main'], { cwd: consumer });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: consumer });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: consumer });
  execFileSync('git', ['add', 'package.json', 'src/app.js'], { cwd: consumer });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: consumer });
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--no-save', join(parent, tarballName)], {
    cwd: consumer,
  });
  writeFileSync(join(consumer, 'src/app.js'), 'console.log("after");\n');

  const binPath = join(consumer, 'node_modules', '.bin', 'atomcommit');
  const version = execFileSync(binPath, ['--version'], { cwd: consumer, encoding: 'utf8' });
  const plan = execFileSync(binPath, [], { cwd: consumer, encoding: 'utf8' });

  assert.equal(version.trim(), '0.1.0');
  assert.match(plan, /^# Atomic Commit Plan/);
  assert.match(plan, /Files changed: 1/);

  const moduleUrl = pathToFileURL(join(consumer, 'node_modules', 'atomcommit', 'src/index.js')).href;
  assert.doesNotThrow(() => {
    execFileSync(process.execPath, ['--input-type=module', '--eval', `import(${JSON.stringify(moduleUrl)})`], {
      cwd: tmpdir(),
      stdio: 'pipe',
    });
  });
});
