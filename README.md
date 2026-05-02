# atomcommit

`atomcommit` is a small, local-first CLI for turning a messy git diff into a reviewable atomic commit plan.

It does **not** stage, commit, rewrite, upload, or call an LLM. It just reads git's diff metadata and gives you a deterministic plan you can follow.

## Why it exists

High-velocity coding sessions get awkward when one working tree contains source changes, docs, tests, CI tweaks, and a surprise deletion. `atomcommit plan` is the calm checkpoint: it separates concerns, points out risky files, and suggests commit messages before you touch `git add`.

## Features

- **Deterministic planning** — same diff in, same Markdown/JSON plan out.
- **Local-only by design** — shells out only to read-only `git diff` commands.
- **Markdown and JSON output** — useful for humans, agents, and scripts.
- **Staged + unstaged awareness** — labels whether each file is staged, unstaged, or both.
- **Diff stat summary** — reads `git diff --stat` alongside name-status and numstat metadata.
- **Risk flags** — calls out deletions, renames, binary files, large changes, lockfiles, merge conflicts, and sensitive-looking paths.
- **Useful grouping** — separates source, tests, docs, CI/repo automation, package metadata, and fallback path groups.

## Install

For local development:

```sh
npm install
npm link
```

Or run directly from a checkout:

```sh
node /path/to/atomcommit/src/index.js plan
```

## Usage

From any git repository with local changes:

```sh
atomcommit plan
```

`atomcommit` with no command is equivalent to `atomcommit plan`.

Machine-readable output:

```sh
atomcommit plan --json
```

Help:

```sh
atomcommit --help
```

## Example

```sh
$ atomcommit plan

# Atomic Commit Plan

- Files changed: 9
- Suggested commits: 4
- Diff stat: 9 files changed, 22 insertions(+), 8 deletions(-)

## 1. Update ci and repository automation

Suggested commit message: `Update ci and repository automation`

Groups 1 file under ci and repository automation.

Files:
- modified: .github/workflows/ci.yml (+3/-1, staged)
```

Full generated examples are checked in:

- [`examples/mixed-plan.md`](examples/mixed-plan.md)
- [`examples/mixed-plan.json`](examples/mixed-plan.json)

## Grouping logic

`atomcommit` uses deterministic path rules, not heuristics that change run to run:

- CI/repo automation: `.github/`, workflow paths.
- Package/dependency metadata: package manifests, lockfiles, common dependency files.
- Documentation: `docs/`, Markdown, and top-level project docs.
- Tests: `test/`, `tests/`, `__tests__/`, `spec/`, `*.test.*`, `*.spec.*`.
- Source code: `src/`, `lib/`, `bin/`, common JS/TS source extensions.
- Fallback: first path segment or root files.

## Risk flags

- `deletion` — deleted file.
- `rename` — renamed or moved file.
- `binary-file` — git numstat cannot provide text stats.
- `large-change` — additions + deletions are at least 400 lines.
- `dependency-lockfile` — lockfile or dependency lock metadata changed.
- `merge-conflict` — git reports an unmerged path.
- `sensitive-path` — path name looks like secrets, credentials, private keys, or `.env` material.

## Safety and privacy

`atomcommit plan` is intentionally boring in the best way:

- It never runs `git add`, `git commit`, `git reset`, `git checkout`, or write commands.
- It does not inspect full file contents for planning; V1 uses git metadata (`name-status`, `numstat`, `stat`).
- It makes no network requests.
- It has no LLM dependency and sends nothing to a remote service.

Still, JSON/Markdown output includes file paths, so treat shared plans like review artifacts.

## Verification

```sh
npm test
npm run check
npm run build
npm run smoke
npm run validate
```

The smoke test creates a fixture git repo, generates Markdown and JSON plans, and verifies expected commit groups and risk flags.

## Fixture repositories

Create the mixed-changes fixture manually:

```sh
bash fixtures/setup-mixed-changes.sh /tmp/atomcommit-fixture
cd /tmp/atomcommit-fixture
atomcommit plan
atomcommit plan --json
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep changes small, reviewable, and covered by the smallest useful verification gate.

## Security

See [SECURITY.md](SECURITY.md). Please avoid posting sensitive details in public issues.

## License

MIT
