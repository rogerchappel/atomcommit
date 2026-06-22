# Roadmap

This roadmap describes intended direction, not a binding delivery promise.
Review it regularly and update it as the project learns from users,
contributors, and implementation constraints.

## Now

- Keep the git-diff planner deterministic and local-only.
- Verify the CLI with fixture-backed tests and smoke checks before release.
- Document the V0.1 safety model and pack contents clearly.

## Next

- Add optional configuration for grouping rules and sensitive-path patterns.
- Provide examples for staged-only and mixed staged/unstaged workflows.
- Add richer JSON schema documentation for agent integrations.

## Later

- Explore editor and GitHub Action integrations once the CLI contract is stable.
- Consider commit-message templates after enough real plans are reviewed.

## Not Planned

- Unrelated platform rewrites without a clear migration path.
- Mandatory dependencies on a single ecosystem unless the project requires it.
- Public release dates before maintainers are ready to commit to them.

## Roadmap Review

Before each major or meaningful minor release:

- Move completed user-visible work into `CHANGELOG.md`.
- Remove stale commitments.
- Promote only the next reviewable set of work into `Now`.
