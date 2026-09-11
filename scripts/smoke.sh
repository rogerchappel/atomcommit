#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/atomcommit-smoke.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

fixture_repo="$tmp_dir/mixed-changes-repo"
bash "$repo_root/fixtures/setup-mixed-changes.sh" "$fixture_repo" >/dev/null

node "$repo_root/src/index.js" --help | grep -q 'Usage: atomcommit'
test "$(node "$repo_root/src/index.js" --version)" = "0.1.0"

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

# Subdirectory invocations must produce the identical root-relative plan.
cd "$fixture_repo/docs"
node "$repo_root/src/index.js" plan --json > "$tmp_dir/plan-sub.json"
node -e '
const fs = require("node:fs");
const [root, sub] = process.argv.slice(1).map((f) => fs.readFileSync(f, "utf8"));
if (root !== sub) throw new Error("plan differs when generated from a subdirectory");
' "$tmp_dir/plan.json" "$tmp_dir/plan-sub.json"

# Outside a git repository the CLI must fail with one concise stderr line.
nongit_dir="$tmp_dir/not-a-repo"
mkdir -p "$nongit_dir"
set +e
nongit_stderr="$(cd "$nongit_dir" && node "$repo_root/src/index.js" plan 2>&1 >/dev/null)"
nongit_status=$?
set -e
if [ "$nongit_status" -ne 1 ]; then
  echo "expected exit 1 outside a git repository, got $nongit_status" >&2
  exit 1
fi
if [ "$nongit_stderr" != "atomcommit: not a git repository" ]; then
  echo "expected one concise stderr line outside a git repository, got: $nongit_stderr" >&2
  exit 1
fi

printf 'Smoke passed: fixture plan generated in Markdown and JSON, subdirectory-stable, and non-repository error concise.\n'
