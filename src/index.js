#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const STATUS_LABELS = {
  A: 'added',
  C: 'copied',
  D: 'deleted',
  M: 'modified',
  R: 'renamed',
  T: 'type changed',
  U: 'unmerged',
  X: 'unknown',
  B: 'broken pair',
};

export function parseNameStatus(output) {
  return output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\t');
      const rawStatus = parts[0];
      const status = rawStatus[0];
      const score = rawStatus.length > 1 ? rawStatus.slice(1) : null;
      const path = status === 'R' || status === 'C' ? parts[2] : parts[1];
      const previousPath = status === 'R' || status === 'C' ? parts[1] : null;

      return {
        path,
        previousPath,
        status,
        statusDetail: rawStatus,
        statusLabel: STATUS_LABELS[status] ?? 'changed',
        score,
      };
    });
}

export function parseNumstat(output) {
  const byPath = new Map();

  for (const line of output.trim().split('\n').filter(Boolean)) {
    const parts = line.split('\t');
    const added = parts[0] === '-' ? null : Number(parts[0]);
    const deleted = parts[1] === '-' ? null : Number(parts[1]);
    const path = parts.at(-1);
    byPath.set(path, { added, deleted, binary: added === null || deleted === null });
  }

  return byPath;
}

export function buildPlan(changes, numstat = new Map()) {
  const enriched = changes
    .map((change) => ({
      ...change,
      stats: numstat.get(change.path) ?? { added: 0, deleted: 0, binary: false },
      group: groupForPath(change.path),
      riskFlags: riskFlags(change, numstat.get(change.path)),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const groups = new Map();
  for (const change of enriched) {
    if (!groups.has(change.group)) {
      groups.set(change.group, []);
    }
    groups.get(change.group).push(change);
  }

  return {
    summary: {
      filesChanged: enriched.length,
      suggestedCommits: groups.size,
    },
    commits: [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([group, files], index) => ({
        order: index + 1,
        title: `Update ${group}`,
        message: `Update ${group}`,
        rationale: `Groups ${files.length} ${files.length === 1 ? 'file' : 'files'} under ${group}.`,
        files,
        riskFlags: [...new Set(files.flatMap((file) => file.riskFlags))].sort(),
      })),
  };
}

export function renderMarkdown(plan) {
  const lines = [
    '# Atomic Commit Plan',
    '',
    `- Files changed: ${plan.summary.filesChanged}`,
    `- Suggested commits: ${plan.summary.suggestedCommits}`,
    '',
  ];

  if (plan.commits.length === 0) {
    lines.push('No local diff detected.');
    return `${lines.join('\n')}\n`;
  }

  for (const commit of plan.commits) {
    lines.push(`## ${commit.order}. ${commit.title}`, '', `Suggested commit message: \`${commit.message}\``, '', commit.rationale, '', 'Files:');

    for (const file of commit.files) {
      const stats = file.stats.binary ? 'binary' : `+${file.stats.added}/-${file.stats.deleted}`;
      const previous = file.previousPath ? ` (from ${file.previousPath})` : '';
      lines.push(`- ${file.statusLabel}: ${file.path}${previous} (${stats})`);
    }

    if (commit.riskFlags.length > 0) {
      lines.push('', `Risk flags: ${commit.riskFlags.join(', ')}`);
    }

    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

export function collectGitDiff(cwd = process.cwd()) {
  const unstaged = parseNameStatus(runGit(['diff', '--name-status'], cwd));
  const staged = parseNameStatus(runGit(['diff', '--cached', '--name-status'], cwd));
  const changes = mergeChanges([...staged, ...unstaged]);
  const stats = mergeStats([
    parseNumstat(runGit(['diff', '--cached', '--numstat'], cwd)),
    parseNumstat(runGit(['diff', '--numstat'], cwd)),
  ]);

  return buildPlan(changes, stats);
}

function mergeChanges(changes) {
  const byPath = new Map();
  for (const change of changes) {
    byPath.set(change.path, { ...byPath.get(change.path), ...change });
  }
  return [...byPath.values()];
}

function mergeStats(statMaps) {
  const merged = new Map();
  for (const stats of statMaps) {
    for (const [path, stat] of stats) {
      const existing = merged.get(path) ?? { added: 0, deleted: 0, binary: false };
      merged.set(path, {
        added: stat.binary || existing.binary ? null : existing.added + stat.added,
        deleted: stat.binary || existing.binary ? null : existing.deleted + stat.deleted,
        binary: existing.binary || stat.binary,
      });
    }
  }
  return merged;
}

function groupForPath(path) {
  if (path.startsWith('.github/')) return 'ci and repository automation';
  if (path.startsWith('docs/') || path.endsWith('.md')) return 'documentation';
  if (path.startsWith('test/') || path.endsWith('.test.js')) return 'tests';
  if (path.startsWith('src/') || path.endsWith('.js')) return 'source code';
  return path.split('/')[0] || 'root files';
}

function riskFlags(change, stats = { added: 0, deleted: 0, binary: false }) {
  const flags = [];
  if (change.status === 'D') flags.push('deletion');
  if (change.status === 'R') flags.push('rename');
  if (stats.binary) flags.push('binary-file');
  if ((stats.added ?? 0) + (stats.deleted ?? 0) >= 400) flags.push('large-change');
  return flags;
}

function runGit(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

function printHelp() {
  console.log(`Usage: atomcommit [plan] [--json]\n\nCommands:\n  plan       Analyze the local git diff and print an atomic commit plan.\n\nDefault:\n  atomcommit is equivalent to atomcommit plan.\n\nOptions:\n  --json     Print machine-readable JSON instead of Markdown.\n  -h, --help Show this help.`);
}

export function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return 0;
  }

  const command = argv[0] === 'plan' ? 'plan' : null;
  const options = command ? argv.slice(1) : argv;

  if (command === null && options.some((option) => !option.startsWith('-'))) {
    console.error(`Unknown command: ${options.find((option) => !option.startsWith('-'))}`);
    printHelp();
    return 1;
  }

  const unsupported = options.filter((option) => option !== '--json');
  if (unsupported.length > 0) {
    console.error(`Unknown option: ${unsupported.join(', ')}`);
    return 1;
  }

  const plan = collectGitDiff(cwd);
  if (options.includes('--json')) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    process.stdout.write(renderMarkdown(plan));
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
