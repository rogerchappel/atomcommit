import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { buildPlan, parseDiffStat, parseNameStatus, parseNumstat, renderMarkdown } from '../src/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = join(__dirname, '..', 'fixtures');
const setupMixedChangesFixture = join(fixturesDir, 'setup-mixed-changes.sh');

function createMixedChangesFixture() {
  const parent = mkdtempSync(join(tmpdir(), 'atomcommit-fixture-'));
  const repo = join(parent, 'mixed-changes-repo');
  execFileSync('bash', [setupMixedChangesFixture, repo], { encoding: 'utf8' });
  return repo;
}

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
      source: 'unstaged',
    },
    {
      path: 'test/plan.test.js',
      previousPath: null,
      status: 'A',
      statusDetail: 'A',
      statusLabel: 'added',
      score: null,
      source: 'unstaged',
    },
    {
      path: 'docs/new.md',
      previousPath: 'docs/old.md',
      status: 'R',
      statusDetail: 'R100',
      statusLabel: 'renamed',
      score: '100',
      source: 'unstaged',
    },
  ]);
});


test('parses git stat summaries for plan metadata', () => {
  const stat = parseDiffStat(` src/index.js | 2 +-
 test/plan.test.js | 4 ++++
 2 files changed, 5 insertions(+), 1 deletion(-)
`);

  assert.equal(stat.summary, '2 files changed, 5 insertions(+), 1 deletion(-)');
  assert.deepEqual(stat.files, ['src/index.js | 2 +-', 'test/plan.test.js | 4 ++++']);
});

test('builds deterministic grouped plan and markdown', () => {
  const plan = buildPlan(parseNameStatus(nameStatusFixture), parseNumstat(numstatFixture));

  assert.deepEqual(plan.summary, { filesChanged: 3, suggestedCommits: 3, diffStat: '0 files changed' });
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

test('fixture repo with mixed changes produces expected plan', () => {
  const fixtureRepo = createMixedChangesFixture();
  const cliPath = join(process.cwd(), 'src/index.js');

  // Verify fixture repo exists
  assert.doesNotThrow(() => {
    execFileSync('git', ['status'], { cwd: fixtureRepo, encoding: 'utf8' });
  }, 'fixture repo should be a valid git repo');

  // Run plan command
  const markdown = execFileSync(process.execPath, [cliPath], { cwd: fixtureRepo, encoding: 'utf8' });
  const jsonOutput = JSON.parse(execFileSync(process.execPath, [cliPath, '--json'], { cwd: fixtureRepo, encoding: 'utf8' }));

  // Verify structure
  assert.match(markdown, /^# Atomic Commit Plan/);
  assert.ok(jsonOutput.summary.filesChanged > 0, 'should detect changed files');
  assert.ok(jsonOutput.commits.length > 0, 'should have commits');

  // Verify all expected groups are present
  const commitTitles = jsonOutput.commits.map((c) => c.title);
  assert.ok(commitTitles.includes('Update ci and repository automation'), 'should have ci commit');
  assert.ok(commitTitles.includes('Update documentation'), 'should have docs commit');
  assert.ok(commitTitles.includes('Update source code'), 'should have source commit');
  assert.ok(commitTitles.includes('Update tests'), 'should have tests commit');

  // Verify risk flags are present where expected
  const docCommit = jsonOutput.commits.find((c) => c.title === 'Update documentation');
  assert.ok(docCommit.riskFlags.includes('rename'), 'documentation commit should have rename flag');

  const sourceCommit = jsonOutput.commits.find((c) => c.title === 'Update source code');
  assert.ok(sourceCommit.riskFlags.includes('deletion'), 'source commit should have deletion flag');

  // Verify deterministic output (run twice, should match)
  const markdown2 = execFileSync(process.execPath, [cliPath], { cwd: fixtureRepo, encoding: 'utf8' });
  assert.equal(markdown, markdown2, 'output should be deterministic');

  const jsonOutput2 = JSON.parse(execFileSync(process.execPath, [cliPath, '--json'], { cwd: fixtureRepo, encoding: 'utf8' }));
  assert.deepEqual(jsonOutput, jsonOutput2, 'JSON output should be deterministic');
});

test('suggests commit messages based on grouped files', () => {
  const fixtureRepo = createMixedChangesFixture();
  const cliPath = join(process.cwd(), 'src/index.js');
  const jsonOutput = JSON.parse(execFileSync(process.execPath, [cliPath, '--json'], { cwd: fixtureRepo, encoding: 'utf8' }));

  // Verify all commits have messages
  for (const commit of jsonOutput.commits) {
    assert.ok(commit.message, 'commit should have message');
    assert.ok(commit.message.length > 0, 'commit message should not be empty');
    assert.ok(commit.rationale, 'commit should have rationale');
    assert.match(commit.message, /^Update /, 'commit message should start with "Update "');
  }
});

test('snapshot: mixed changes produce consistent plan', () => {
  const fixtureRepo = createMixedChangesFixture();
  const cliPath = join(process.cwd(), 'src/index.js');
  const jsonOutput = execFileSync(process.execPath, [cliPath, '--json'], { cwd: fixtureRepo, encoding: 'utf8' });

  // Known-good snapshot of the mixed-changes fixture plan structure
  const expected = JSON.parse(jsonOutput);

  assert.equal(expected.summary.filesChanged, 9, 'should have 9 files changed');
  assert.equal(expected.summary.suggestedCommits, 4, 'should have 4 suggested commits');
  assert.equal(expected.commits.length, 4, 'should have 4 commits array items');

  // Verify order, titles, and file counts for each commit
  const expectedStructure = [
    { title: 'Update ci and repository automation', fileCount: 1, riskFlags: [] },
    { title: 'Update documentation', fileCount: 3, riskFlags: ['rename'] },
    { title: 'Update source code', fileCount: 3, riskFlags: ['deletion'] },
    { title: 'Update tests', fileCount: 2, riskFlags: [] },
  ];

  for (let i = 0; i < expectedStructure.length; i++) {
    const commit = expected.commits[i];
    const exp = expectedStructure[i];
    assert.equal(commit.order, i + 1, `commit ${i + 1} order should be correct`);
    assert.equal(commit.title, exp.title, `commit ${i + 1} title should match`);
    assert.equal(commit.files.length, exp.fileCount, `commit ${i + 1} file count should match`);
    assert.deepEqual(commit.riskFlags, exp.riskFlags, `commit ${i + 1} risk flags should match`);
  }

  // Verify specific file entries
  const docCommit = expected.commits[1];
  const renamedFile = docCommit.files.find((f) => f.status === 'R');
  assert.ok(renamedFile, 'should find renamed file');
  assert.equal(renamedFile.path, 'CONTRIBUTING.md', 'renamed file should be CONTRIBUTING.md');
  assert.equal(renamedFile.previousPath, 'README.md', 'renamed file previous path should be README.md');

  const srcCommit = expected.commits[2];
  const deletedFile = srcCommit.files.find((f) => f.status === 'D');
  assert.ok(deletedFile, 'should find deleted file');
  assert.equal(deletedFile.path, 'src/asset.bin', 'deleted file should be src/asset.bin');
});
