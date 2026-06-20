# atomcommit MVP Tasks

## Objective

Build a deterministic local CLI, `atomcommit plan`, that reads a repository's git diff metadata and produces an atomic commit plan in Markdown or JSON without mutating the repository.

## Repository

- Repo: `atomcommit`
- Remote: `git@github.com:rogerchappel/atomcommit.git`
- Primary command: `atomcommit plan`
- Default command: `atomcommit` behaves like `atomcommit plan`

## Completed MVP Scope

- [x] CLI entrypoint with `atomcommit plan`, default command, `--json`, and `--help`.
- [x] Read-only git integration using:
  - `git diff --name-status`
  - `git diff --cached --name-status`
  - `git diff --numstat`
  - `git diff --cached --numstat`
  - `git diff --stat`
  - `git diff --cached --stat`
- [x] Deterministic grouping by CI/repo automation, package metadata, docs, tests, source, and fallback path groups.
- [x] Markdown renderer with summary, suggested commit messages, grouped files, source labels, line stats, and risk flags.
- [x] JSON renderer for machine-readable plans.
- [x] Staged/unstaged awareness with `staged`, `unstaged`, and `staged+unstaged` labels.
- [x] Risk flags for deletion, rename, merge conflict, binary file, large change, lockfile, and sensitive-looking paths.
- [x] Fixture generator for a mixed-change git repository.
- [x] Tests for parsers, deterministic grouping, CLI no-mutation behavior, fixture smoke behavior, commit messages, and snapshots.
- [x] README, examples, CONTRIBUTING, SECURITY, package metadata, validation script, and smoke script.

## Verification Commands

- `npm test`
- `npm run check`
- `npm run build`
- `npm run smoke`
- `npm run validate`

## Human Review Points

- Grouping logic is deterministic and intentionally simple for V1.
- Commit messages are conservative (`Add`, `Remove`, `Rename`, `Update`) and scoped by group.
- The CLI is local-first and does not stage, commit, reset, checkout, rewrite, upload, or call external services.

## Follow-up Ideas

- Add optional path filters, e.g. `atomcommit plan -- path/to/file`.
- Add configurable grouping rules.
- Add richer handling for rename numstat path formats.
- Add shell completions after the CLI surface stabilizes.
