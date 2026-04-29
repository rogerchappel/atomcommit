# PRD: atomcommit

Status: ready

## Scorecard

Total: 87/100
Band: build now
Last scored: 2026-04-29
Scored by: Neo

| Criterion | Points | Notes |
|---|---:|---|
| Problem pain | 19/20 | Messy multi-file changes are a core bottleneck for reviewable agent output. |
| Demand signal | 17/20 | Strong internal demand from the 3-file commit gate and high-commit sprint workflow; external validation still needed. |
| V1 buildability | 19/20 | Local git diff parsing and deterministic grouping are feasible in V1. |
| Differentiation | 13/15 | Focused on agent review discipline rather than generic git stats. |
| Agentic workflow leverage | 15/15 | Helps every coding agent produce smaller, cleaner commits. |
| Distribution potential | 4/10 | Valuable developer tool, but needs examples/content to spread. |

## Pitch

Turn messy working tree changes into an atomic commit plan.

## Why It Matters

High commit velocity only works if commits are clean, reviewable checkpoints.

## V1 Scope

- CLI: `atomcommit plan`
- Reads `git diff --name-status`, `git diff --stat`, optionally `git diff --numstat`
- Groups files into suggested commit slices by path/type
- Outputs Markdown and JSON
- Adds deterministic risk flags
- Suggests commit messages

## Out of Scope

- No auto-commit
- No auto-stage
- No LLM requirement

## Verification

- Fixture repos with mixed changes
- Snapshot tests for generated plans

## Agent Prompt

Build `atomcommit`, a deterministic local CLI that analyzes a git working tree and produces an atomic commit plan in Markdown/JSON. It must not mutate the repo. Include fixtures, risk flags, tests, README, and examples.
