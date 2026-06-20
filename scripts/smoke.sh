#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/atomcommit-smoke.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

fixture_repo="$tmp_dir/mixed-changes-repo"
bash "$repo_root/fixtures/setup-mixed-changes.sh" "$fixture_repo" >/dev/null

markdown_output="$(node "$repo_root/src/index.js" plan < /dev/null 2>/dev/null || true)"
if [ -z "$markdown_output" ]; then
  : # running outside a git repo may fail; the fixture smoke below is authoritative
fi

cd "$fixture_repo"
node "$repo_root/src/index.js" plan > "$tmp_dir/plan.md"
node "$repo_root/src/index.js" plan --json > "$tmp_dir/plan.json"

node -e '
const fs = require("node:fs");
const plan = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (plan.summary.filesChanged !== 9) throw new Error(`expected 9 files changed, got ${plan.summary.filesChanged}`);
if (plan.summary.suggestedCommits !== 4) throw new Error(`expected 4 suggested commits, got ${plan.summary.suggestedCommits}`);
if (!plan.commits.some((commit) => commit.riskFlags.includes("rename"))) throw new Error("expected rename risk flag");
if (!plan.commits.some((commit) => commit.riskFlags.includes("deletion"))) throw new Error("expected deletion risk flag");
' "$tmp_dir/plan.json"

grep -q '^# Atomic Commit Plan' "$tmp_dir/plan.md"
grep -q 'Suggested commit message:' "$tmp_dir/plan.md"

printf 'Smoke passed: fixture plan generated in Markdown and JSON.\n'
