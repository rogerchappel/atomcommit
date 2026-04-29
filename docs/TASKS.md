# Task Brief: Implement CLI command `atomcommit plan` to analyze git working tree and produce atomic commit plan

## Objective

Create a CLI tool that reads git diffs and outputs atomic commit plans

## Repository

atomcommit

## Suggested Branch

agent/implement-cli-command-atomcommit-plan-to-analyze-git-working-tree-and-pr

## Task Type

feature

## Risk Level

Medium

## Context

Source: llm (openai:gpt-4.1-mini)

The CLI should read `git diff --name-status`, `git diff --stat`, and optionally `git diff --numstat` to group files into commit slices by path and type, outputting Markdown and JSON with risk flags and suggested commit messages.

## Allowed Paths

- cli/
- lib/
- tests/
- docs/

## Forbidden Paths

- auto_commit/
- auto_stage/
- llm_integration/

## Expected Commits

- Add CLI command `atomcommit plan`
- Implement git diff parsing for name-status, stat, and numstat
- Add logic to group files into commit slices by path and type
- Generate Markdown and JSON output formats
- Add deterministic risk flagging logic
- Suggest commit messages based on grouped files

## Verification

- Run fixture repos with mixed changes through CLI
- Verify output matches snapshot tests for generated plans
- Check output includes deterministic risk flags and suggested commit messages

## Stop Conditions

- CLI produces correct atomic commit plans in Markdown and JSON
- All snapshot tests pass
- No mutations to the git repo occur during CLI execution

## Review Pack Required

Yes.

## Human Decision Needed

- Approve grouping logic and risk flag criteria
- Validate commit message suggestion quality

## Agent Prompt

Build `atomcommit`, a deterministic local CLI that analyzes a git working tree and produces an atomic commit plan in Markdown/JSON. It must not mutate the repo. Include fixtures, risk flags, tests, README, and examples.
