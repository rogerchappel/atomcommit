#!/usr/bin/env bash
set -euo pipefail

# Create a deterministic fixture repo with mixed changes for testing atomcommit plan

output_dir="${1:-$(pwd)/fixtures/mixed-changes-repo}"

rm -rf "$output_dir"
mkdir -p "$output_dir"
cd "$output_dir"

git init
git config user.email "fixture@example.com"
git config user.name "Fixture User"

# Initial commit with some files
mkdir -p src docs test .github/workflows

cat > src/app.js <<EOF
function main() {
  console.log("hello");
}
module.exports = { main };
EOF

cat > src/utils.js <<EOF
function helper() {
  return 42;
}
module.exports = { helper };
EOF

cat > test/app.test.cjs <<EOF
const { main } = require("../src/app");
test("main runs", () => { main(); });
EOF

cat > docs/intro.md <<EOF
# Intro

This is the intro.
EOF

cat > .github/workflows/ci.yml <<EOF
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
EOF

cat > README.md <<EOF
# Fixture Project

Initial version.
EOF

# Create a binary file
printf '\x89PNG\r\n\x1a\n' > src/asset.bin

git add .
git commit -m "initial commit"

# Now make mixed changes
cat > src/app.js <<EOF
function main() {
  console.log("hello world");
  console.log("more output");
}
module.exports = { main };
EOF

cat > src/utils.js <<EOF
function helper() {
  return 100;
}
function extra() {
  return true;
}
module.exports = { helper, extra };
EOF

cat > test/utils.test.cjs <<EOF
const { helper, extra } = require("../src/utils");
test("helper returns correct value", () => {
  expect(helper()).toBe(100);
});
EOF

cat > test/app.test.cjs <<EOF
const { main } = require("../src/app");
test("main runs", () => { main(); });
test("main outputs correctly", () => { expect(true).toBe(true); });
EOF

cat > docs/intro.md <<EOF
# Introduction

Welcome to the project. This is updated documentation.
EOF

cat > docs/api.md <<EOF
# API Reference

## main()

Runs the main function.
EOF

cat > .github/workflows/ci.yml <<EOF
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm test
EOF

rm src/asset.bin
mv README.md CONTRIBUTING.md

git add .
git status

echo "---"
echo "Fixture repo ready at: $output_dir"
echo "Run: git status"
echo "Run: atomcommit plan  (from the fixture directory)"
