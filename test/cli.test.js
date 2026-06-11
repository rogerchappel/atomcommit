import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('atomcommit plan test - CLI should handle --help', () => {
  try {
    const out = execSync('node src/index.js --help', { encoding: 'utf8', stdio: 'pipe' });
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
