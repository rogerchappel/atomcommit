#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

const GROUP_RULES = [
  ['ci and repository automation', (path) => path.startsWith('.github/') || path.includes('/workflows/')],
  ['package and dependency metadata', (path) => /(^|\/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb|Cargo\.lock|go\.sum|requirements.*\.txt|poetry\.lock)$/.test(path)],
  ['documentation', (path) => path.startsWith('docs/') || /(^|\/)(README|CHANGELOG|CONTRIBUTING|SECURITY|CODE_OF_CONDUCT|ROADMAP|LICENSE)(\.[^.]+)?$/i.test(path) || path.endsWith('.md')],
  ['tests', (path) => path.startsWith('test/') || path.startsWith('tests/') || /(^|\/)(__tests__|spec)\//.test(path) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(path)],
  ['source code', (path) => path.startsWith('src/') || path.startsWith('lib/') || path.startsWith('bin/') || /\.[cm]?[jt]sx?$/.test(path)],
];

const VERSION = '0.1.0';

export function parseNameStatus(output, source = 'unstaged') {
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
        source,
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

export function parseUntrackedPaths(output) {
  return output
    .split('\0')
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function parseDiffStat(output) {
  const lines = output.trim().split('\n').filter(Boolean);
  const summary = (lines.at(-1) ?? '0 files changed').trim();
  const fileLines = summary.includes('|') ? lines : lines.slice(0, -1);

  return {
    raw: output.trim(),
    summary,
    files: fileLines.map((line) => line.trim()),
  };
}

export function buildPlan(changes, numstat = new Map(), diffStat = { raw: '', summary: '0 files changed', files: [] }) {
  const enriched = changes
    .map((change) => {
      const stats = numstat.get(change.path) ?? { added: 0, deleted: 0, binary: false };
      return {
        ...change,
        stats,
        group: groupForPath(change.path),
        riskFlags: riskFlags(change, stats),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  const groups = new Map();
  for (const change of enriched) {
    if (!groups.has(change.group)) {
      groups.set(change.group, []);
    }
    groups.get(change.group).push(change);
  }

  const commits = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, files], index) => ({
      order: index + 1,
      title: `Update ${group}`,
      message: commitMessageFor(group, files),
      rationale: `Groups ${files.length} ${files.length === 1 ? 'file' : 'files'} under ${group}.`,
      files,
      riskFlags: [...new Set(files.flatMap((file) => file.riskFlags))].sort(),
    }));

  return {
    summary: {
      filesChanged: enriched.length,
      suggestedCommits: commits.length,
      diffStat: diffStat.summary,
    },
    commits,
  };
}

export function renderMarkdown(plan) {
  const lines = [
    '# Atomic Commit Plan',
    '',
    `- Files changed: ${plan.summary.filesChanged}`,
    `- Suggested commits: ${plan.summary.suggestedCommits}`,
  ];

  if (plan.summary.diffStat) {
    lines.push(`- Diff stat: ${plan.summary.diffStat}`);
  }

  lines.push('');

  if (plan.commits.length === 0) {
    lines.push('No local diff detected.');
    return `${lines.join('\n')}\n`;
  }

  for (const commit of plan.commits) {
    lines.push(`## ${commit.order}. ${commit.title}`, '', `Suggested commit message: \`${commit.message}\``, '', commit.rationale, '', 'Files:');

    for (const file of commit.files) {
      const stats = file.stats.binary ? 'binary' : `+${file.stats.added}/-${file.stats.deleted}`;
      const previous = file.previousPath ? ` (from ${file.previousPath})` : '';
      const source = file.source === 'staged+unstaged' ? ', staged + unstaged' : `, ${file.source}`;
      lines.push(`- ${file.statusLabel}: ${file.path}${previous} (${stats}${source})`);
    }

    if (commit.riskFlags.length > 0) {
      lines.push('', `Risk flags: ${commit.riskFlags.join(', ')}`);
    }

    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

export function collectGitDiff(cwd = process.cwd()) {
  const unstaged = parseNameStatus(runGit(['diff', '--name-status'], cwd), 'unstaged');
  const staged = parseNameStatus(runGit(['diff', '--cached', '--name-status'], cwd), 'staged');
  const untrackedPaths = parseUntrackedPaths(runGit(['ls-files', '--others', '--exclude-standard', '-z'], cwd));
  const untracked = untrackedPaths.map((path) => ({
    path,
    previousPath: null,
    status: 'A',
    statusDetail: 'A',
    statusLabel: 'added',
    score: null,
    source: 'untracked',
  }));
  const untrackedStats = new Map(untrackedPaths.map((path) => [path, untrackedStat(path, cwd)]));
  const changes = mergeChanges([...staged, ...unstaged, ...untracked]);
  const stats = mergeStats([
    parseNumstat(runGit(['diff', '--cached', '--numstat'], cwd)),
    parseNumstat(runGit(['diff', '--numstat'], cwd)),
    untrackedStats,
  ]);
  const diffStat = mergeDiffStats([
    parseDiffStat(runGit(['diff', '--cached', '--stat'], cwd)),
    parseDiffStat(runGit(['diff', '--stat'], cwd)),
    untrackedDiffStat(untrackedStats),
  ]);

  return buildPlan(changes, stats, diffStat);
}

function untrackedStat(path, cwd) {
  const output = runGit(['diff', '--no-index', '--numstat', '--', '/dev/null', path], cwd, [0, 1]);
  const [added, deleted] = output.split('\t');
  const binary = added === '-' || deleted === '-';
  return {
    added: binary ? null : Number(added),
    deleted: binary ? null : Number(deleted),
    binary,
  };
}

function untrackedDiffStat(stats) {
  if (stats.size === 0) return { raw: '', summary: '0 files changed', files: [] };
  let insertions = 0;
  for (const stat of stats.values()) {
    insertions += stat.added ?? 0;
  }
  const parts = [`${stats.size} ${stats.size === 1 ? 'file' : 'files'} changed`];
  if (insertions > 0) parts.push(`${insertions} ${insertions === 1 ? 'insertion' : 'insertions'}(+)`);
  const summary = parts.join(', ');
  return { raw: summary, summary, files: [] };
}

function mergeChanges(changes) {
  const byPath = new Map();
  for (const change of changes) {
    const existing = byPath.get(change.path);
    if (!existing) {
      byPath.set(change.path, change);
      continue;
    }
    byPath.set(change.path, {
      ...existing,
      ...change,
      previousPath: existing.previousPath ?? change.previousPath,
      source: existing.source === change.source ? change.source : 'staged+unstaged',
    });
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

function mergeDiffStats(stats) {
  const nonEmpty = stats.filter((stat) => stat.raw.length > 0);
  if (nonEmpty.length === 0) return { raw: '', summary: '0 files changed', files: [] };
  return {
    raw: nonEmpty.map((stat) => stat.raw).join('\n'),
    summary: summarizeStats(nonEmpty),
    files: nonEmpty.flatMap((stat) => stat.files),
  };
}

function summarizeStats(stats) {
  let files = 0;
  let insertions = 0;
  let deletions = 0;

  for (const stat of stats) {
    const summary = stat.summary;
    files += Number(summary.match(/(\d+) files? changed/)?.[1] ?? 0);
    insertions += Number(summary.match(/(\d+) insertions?/)?.[1] ?? 0);
    deletions += Number(summary.match(/(\d+) deletions?/)?.[1] ?? 0);
  }

  const parts = [`${files} ${files === 1 ? 'file' : 'files'} changed`];
  if (insertions > 0) parts.push(`${insertions} ${insertions === 1 ? 'insertion' : 'insertions'}(+)`);
  if (deletions > 0) parts.push(`${deletions} ${deletions === 1 ? 'deletion' : 'deletions'}(-)`);
  return parts.join(', ');
}

function groupForPath(path) {
  for (const [group, matches] of GROUP_RULES) {
    if (matches(path)) return group;
  }
  return path.includes('/') ? `${path.split('/')[0]} files` : 'root files';
}

function riskFlags(change, stats = { added: 0, deleted: 0, binary: false }) {
  const flags = [];
  if (change.status === 'D') flags.push('deletion');
  if (change.status === 'R') flags.push('rename');
  if (change.status === 'U') flags.push('merge-conflict');
  if (stats.binary) flags.push('binary-file');
  if ((stats.added ?? 0) + (stats.deleted ?? 0) >= 400) flags.push('large-change');
  if (/lock$|lock\.json$|lock\.yaml$|package-lock\.json$/.test(change.path)) flags.push('dependency-lockfile');
  if (/\.env(\.|$)|secret|credential|private-key/i.test(change.path)) flags.push('sensitive-path');
  return flags;
}

function commitMessageFor(group, files) {
  const statuses = new Set(files.map((file) => file.status));
  if (statuses.size === 1 && statuses.has('A')) return `Add ${group}`;
  if (statuses.size === 1 && statuses.has('D')) return `Remove ${group}`;
  if (statuses.has('R') && files.length === 1) return `Rename ${group}`;
  return `Update ${group}`;
}

function runGit(args, cwd, allowedStatuses = [0]) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (!allowedStatuses.includes(result.status)) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

function printHelp() {
  console.log(`Usage: atomcommit [plan] [--json]\n\nCommands:\n  plan       Analyze local tracked and untracked changes and print an atomic commit plan.\n\nDefault:\n  atomcommit is equivalent to atomcommit plan.\n\nOptions:\n  --json        Print machine-readable JSON instead of Markdown.\n  -h, --help    Show this help.\n  -v, --version Print the CLI version.\n\nSafety:\n  atomcommit only runs read-only git diff and git ls-files commands and never stages, commits, or modifies files.`);
}

export function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return 0;
  }

  if (argv.includes('--version') || argv.includes('-v') || argv[0] === 'version') {
    console.log(VERSION);
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

function isMainModule(moduleUrl, argvPath = process.argv[1]) {
  if (!argvPath) return false;

  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(argvPath);
  } catch {
    return false;
  }
}

if (isMainModule(import.meta.url)) {
  process.exitCode = main();
}
