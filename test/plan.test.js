import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { buildPlan, parseNameStatus, parseNumstat, renderMarkdown } from '../src/index.js';

const nameStatusFixture = `M\tsrc/index.js\nA\ttest/plan.test.js\nR100\tdocs/old.md\tdocs/new.md\n`;
const numstatFixture = `12\t3\tsrc/index.js\n45\t0\ttest/plan.test.js\n1\t1\tdocs/new.md\n`;

test('parses git name-status metadata including renames', () => {
  assert.deepEqual(parseNameStatus(nameStatusFixture), [
    {
      path: 'src/index.js',
      previousPath: null,
      status: 'M',
      statusDetail: 'M',
      statusLabel: 'modified',
      score: null,
    },
    {
      path: 'test/plan.test.js',
      previousPath: null,
      status: 'A',
      statusDetail: 'A',
      statusLabel: 'added',
      score: null,
    },
    {
      path: 'docs/new.md',
      previousPath: 'docs/old.md',
      status: 'R',
      statusDetail: 'R100',
      statusLabel: 'renamed',
      score: '100',
    },
  ]);
});

test('builds deterministic grouped plan and markdown', () => {
  const plan = buildPlan(parseNameStatus(nameStatusFixture), parseNumstat(numstatFixture));

  assert.deepEqual(plan.summary, { filesChanged: 3, suggestedCommits: 3 });
  assert.deepEqual(
    plan.commits.map((commit) => commit.title),
    ['Update documentation', 'Update source code', 'Update tests'],
  );
  assert.match(renderMarkdown(plan), /## 1\. Update documentation/);
  assert.match(renderMarkdown(plan), /Risk flags: rename/);
});

test('cli reads local git diff without mutating the working tree', () => {
  const repo = mkdtempSync(join(tmpdir(), 'atomcommit-'));
  execFileSync('git', ['init'], { cwd: repo });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repo });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: repo });
  mkdirSync(join(repo, 'src'));
  writeFileSync(join(repo, 'src/app.js'), 'console.log("before");\n');
  execFileSync('git', ['add', '.'], { cwd: repo });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: repo });
  writeFileSync(join(repo, 'src/app.js'), 'console.log("after");\n');

  execFileSync('git', ['add', 'src/app.js'], { cwd: repo });
  const beforeStatus = execFileSync('git', ['status', '--short'], { cwd: repo, encoding: 'utf8' });
  const cliPath = join(process.cwd(), 'src/index.js');
  const markdown = execFileSync(process.execPath, [cliPath], { cwd: repo, encoding: 'utf8' });
  const output = execFileSync(process.execPath, [cliPath, '--json'], { cwd: repo, encoding: 'utf8' });
  const afterStatus = execFileSync('git', ['status', '--short'], { cwd: repo, encoding: 'utf8' });

  assert.equal(afterStatus, beforeStatus);
  assert.match(markdown, /^# Atomic Commit Plan/);
  assert.equal(JSON.parse(output).commits[0].message, 'Update source code');
});
