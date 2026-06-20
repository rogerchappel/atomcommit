# Atomic Commit Plan

- Files changed: 9
- Suggested commits: 4
- Diff stat: 9 files changed, 22 insertions(+), 8 deletions(-)

## 1. Update ci and repository automation

Suggested commit message: `Update ci and repository automation`

Groups 1 file under ci and repository automation.

Files:
- modified: .github/workflows/ci.yml (+3/-1, staged)

## 2. Update documentation

Suggested commit message: `Update documentation`

Groups 3 files under documentation.

Files:
- renamed: CONTRIBUTING.md (from README.md) (+0/-0, staged)
- added: docs/api.md (+5/-0, staged)
- modified: docs/intro.md (+2/-2, staged)

Risk flags: rename

## 3. Update source code

Suggested commit message: `Update source code`

Groups 3 files under source code.

Files:
- modified: src/app.js (+2/-1, staged)
- deleted: src/asset.bin (+0/-2, staged)
- modified: src/utils.js (+5/-2, staged)

Risk flags: deletion

## 4. Update tests

Suggested commit message: `Update tests`

Groups 2 files under tests.

Files:
- modified: test/app.test.cjs (+1/-0, staged)
- added: test/utils.test.cjs (+4/-0, staged)
