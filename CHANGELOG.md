# Changelog

All notable changes to this project will be documented in this file.

This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
format and uses semantic versioning when versioned releases are published.

## [Unreleased]

### Fixed

- `plan` now resolves the repository root via `git rev-parse --show-toplevel`
  and runs every read-only git command from it, so invoking the CLI from any
  subdirectory produces the same root-relative plan as the repository root
  (previously untracked files outside the current directory were dropped and
  listed with cwd-relative paths).
- Outside a git repository, `atomcommit plan` prints a single
  `atomcommit: not a git repository` stderr line and exits 1 instead of
  surfacing raw `git diff` usage output and an uncaught Node.js stack trace.

### Added

- Release-candidate metadata, package allowlist, and npm pack smoke coverage.
- Fixture-backed CLI smoke test for Markdown and JSON output.
- README quickstart, safety notes, and release verification commands.

## Release Links

- Unreleased:
  `https://github.com/rogerchappel/atomcommit/compare/...HEAD`
- Latest release:
  `https://github.com/rogerchappel/atomcommit/releases/latest`

Replace placeholder links once the first release tag exists.
