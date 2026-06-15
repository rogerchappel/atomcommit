# Release Readiness

Use this checklist before cutting a release or asking a reviewer to trust the package contents.

## Public Package Surface

- Package: `atomcommit`
- Repository: `https://github.com/rogerchappel/atomcommit`
- Published files are controlled by the `files` allowlist in `package.json`.

## CLI Surface

- `atomcommit` -> `./src/index.js`

## Verification Commands

- `npm run check`: `node --check src/index.js && node --test test/*.test.js`
- `npm run test`: `node --test test/*.test.js`
- `npm run build`: `node --check src/index.js`
- `npm run smoke`: `bash scripts/smoke.sh`
- `npm run package:smoke`: `npm pack --dry-run`
- `npm run release:check`: `npm run check && npm run smoke && npm run package:smoke`

Run `npm run release:check` when available before opening a release PR. When a command is unavailable, use the closest listed command and record the reason in the PR.

## Reviewer Notes

- Confirm README examples still match the CLI or module exports.
- Confirm `npm pack --dry-run` does not include local fixtures, generated logs, or build caches beyond the intended allowlist.
- Confirm GitHub Actions runs the same install and package smoke path used locally.
