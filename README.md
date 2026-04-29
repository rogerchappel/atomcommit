# atomcommit

Deterministic local CLI that analyzes a git working tree and produces an atomic commit plan in Markdown/JSON.

## Status

This repository is early-stage. Confirm the current support, release, and
security posture before using it in production.

## Overview

`atomcommit` inspects your local git diff (`git diff --name-status` and `git diff --numstat`) and produces a **deterministic atomic commit plan**. It groups related files into suggested commit slices and assigns risk flags so you can craft reviewable, focused commits.

Key features:
- **No repo mutation** — reads git diff metadata only, never modifies your working tree
- **Deterministic output** — same changes always produce the same plan
- **Risk flagging** — highlights deletions, renames, binary files, and large changes
- **Grouped commits** — files grouped by type: source code, tests, documentation, CI automation, and more
- **Suggested commit messages** — each group gets a meaningful commit summary

## Install

```sh
pnpm install
```

## Usage

### Default plan command

From a repo with local changes:

```sh
atomcommit
```

This is equivalent to:

```sh
atomcommit plan
```

Both commands print a Markdown-formatted atomic commit plan to stdout.

### JSON output (for tooling)

Use `--json` when another tool needs machine-readable output:

```sh
atomcommit --json
```

### Help

```sh
atomcommit --help
```

## Example

Given a working tree with changes across multiple file types:

```sh
$ atomcommit

# Atomic Commit Plan

- Files changed: 9
- Suggested commits: 4

## 1. Update ci and repository automation

Suggested commit message: `Update ci and repository automation`

Groups 1 file under ci and repository automation.

Files:
- modified: .github/workflows/ci.yml (+3/-1)

## 2. Update documentation

Suggested commit message: `Update documentation`

Groups 3 files under documentation.

Files:
- renamed: CONTRIBUTING.md (from README.md) (+0/-0)
- added: docs/api.md (+5/-0)
- modified: docs/intro.md (+2/-2)

Risk flags: rename

## 3. Update source code

Suggested commit message: `Update source code`

Groups 3 files under source code.

Files:
- modified: src/app.js (+2/-1)
- deleted: src/asset.bin (+0/-2)
- modified: src/utils.js (+5/-2)

Risk flags: deletion

## 4. Update tests

Suggested commit message: `Update tests`

Groups 2 files under tests.

Files:
- modified: test/app.test.js (+1/-0)
- added: test/utils.test.js (+4/-0)
```

### Grouping Logic

Files are grouped by path and extension:

| Group | Matching Pattern |
|---|---|
| CI and repository automation | `.github/*`, CI workflows |
| Documentation | `docs/*`, `*.md` files |
| Tests | `test/*`, `*.test.js`, `*.test.*` |
| Source code | `src/*`, `*.js` source files |
| Root files | top-level files not matching other patterns |

### Risk Flags

The plan flags certain changes for extra review attention:

| Flag | Trigger |
|---|---|
| `deletion` | File deleted from working tree |
| `rename` | File renamed/moved |
| `binary-file` | Binary file change (no text stats) |
| `large-change` | Combined additions + deletions ≥ 400 lines |

## Verify

Run the local validation script before opening a pull request:

```sh
bash scripts/validate.sh
```

This runs the package test suite and checks for required files. The script will also run `agent-qc ready` when `agent-qc` is installed. Missing `agent-qc` is treated as a skip, not a failure.

Run tests directly:

```sh
npm test
```

## Fixture Repositories

The `fixtures/` directory contains deterministic test repos. To recreate:

```sh
bash fixtures/setup-mixed-changes.sh
```

Then test against the fixture:

```sh
cd fixtures/mixed-changes-repo
atomcommit
```

See [fixtures/README.md](fixtures/README.md) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations. Changes
should be small, reviewable, and verified before review.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance. Replace
the default security policy before publishing the generated repository.

These links assume this README has been copied to the generated repository root.

## License

MIT
