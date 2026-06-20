# Fixture Repositories

These are deterministic fixture repositories used for validating the `atomcommit plan` CLI.

## Mixed Changes Fixture

The `setup-mixed-changes.sh` script creates a temporary repository with multiple types of changes:
- Modified source files
- New test files
- Documentation changes
- CI/CD configuration changes
- Binary file additions
- Deleted files
- Renamed files

This exercises all grouping logic, risk flagging, and commit message suggestion.
