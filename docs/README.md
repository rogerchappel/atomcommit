# atomcommit Documentation

This directory holds project documentation.

## Contents

- [Product Requirements Document](PRD.md) — product vision and V1 scope
- [Task Brief](TASKS.md) — current development tasks and verification targets
- [Orchestration](ORCHESTRATION.md) — handoff and wave dispatch notes
- [Contributing guide](../CONTRIBUTING.md)
- [Security policy](../SECURITY.md)
- [Agent instructions](../AGENTS.md)

## Decision Log: Grouping Logic and Risk Flags

### Grouping Logic

The `atomcommit plan` command groups files into suggested commits based on file path and extension. This makes each commit focused on a single concern (e.g., documentation, tests, source code).

**Current grouping rules** (defined in `src/index.js`):

| Group | Pattern Matching |
|---|---|
| CI and repository automation | Files under `.github/` directory |
| Documentation | Files under `docs/` or ending in `.md` |
| Tests | Files under `test/` or matching `*.test.js` pattern |
| Source code | Files under `src/` or ending in `.js` |
| Root files | Top-level files not matching other patterns |

**Rationale**: These groups reflect common development practices where related changes are co-located. For example, documentation changes are typically reviewed together, and test changes should be separate from production code.

### Risk Flags

Deterministic flags are assigned based on the git change type and file characteristics:

| Flag | Trigger Condition |
|---|---|
| `deletion` | Git status `D` (file deleted) |
| `rename` | Git status `R` (file renamed/moved) |
| `binary-file` | File has no text stats (binary content) |
| `large-change` | Total additions + deletions ≥ 400 lines |

**Rationale**: These flags highlight changes that typically require extra review attention:
- **Deletions** may remove functionality that other code depends on
- **Renames** can break imports and references
- **Binary files** are harder to review in diffs
- **Large changes** indicate complex work that may benefit from smaller commits

### Future Enhancements

Possible future grouping improvements:
- Custom rules via configuration file (`.atomcommitrc`)
- Semantic grouping based on co-change history
- Override grouping for specific paths
- Language-specific grouping rules
