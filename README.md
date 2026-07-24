# atomcommit

`atomcommit` is a local-first CLI that turns staged, unstaged, and ordinary untracked changes into deterministic atomic commit plans.

## Status

Early V0.1 release candidate. The planner is useful for local git diffs, but it does not stage files, create commits, push branches, or infer product intent.

## Install from a checkout

```sh
git clone https://github.com/rogerchappel/atomcommit.git
cd atomcommit
npm install
```

After publication, install the CLI with npm:

```sh
npm install -g atomcommit
```

## Quickstart

From a checkout, generate an atomic commit plan for the current repository:

```sh
node src/index.js plan
```

After installing the package binary, use the shorter command:

```sh
atomcommit
atomcommit plan
```

Use JSON output for automation:

```sh
atomcommit plan --json
```

Print version or help without needing to be inside a git repository:

```sh
atomcommit --version
atomcommit --help
```

## What it reads

`atomcommit` shells out only to these read-only Git commands:

- `git diff --name-status`
- `git diff --cached --name-status`
- `git diff --numstat`
- `git diff --stat`
- `git ls-files --others --exclude-standard -z`
- `git diff --no-index --numstat -- /dev/null <untracked-path>`

The `git ls-files` query includes ordinary untracked files while respecting Git ignore rules. NUL-delimited paths preserve spaces and other special characters. The CLI remains read-only: it does not stage files, alter the index, or modify the working tree.

It groups changes by repository area such as documentation, tests, source code, package metadata, and CI automation. It also flags review risks such as deletions, renames, lockfiles, large changes, binary files, and sensitive-looking paths.

## Fixture smoke

The repository includes a deterministic mixed-change fixture:

```sh
bash fixtures/setup-mixed-changes.sh /tmp/atomcommit-fixture
cd /tmp/atomcommit-fixture
node /path/to/atomcommit/src/index.js plan --json
```

The fixture covers source edits, docs, tests, workflow changes, a rename, and a deletion.

## Verification

```sh
npm test
npm run check
npm run smoke
npm run package:smoke
npm run release:check
bash scripts/validate.sh
```

## Limitations

- The package is still a v0.1.0 project and its JSON shape may change before 1.0.
- Commit boundaries are structural suggestions. Humans still choose the final history.
- Sensitive-path flags are heuristics, not a secret scanner or compliance control.
- Git rename detection follows `git diff --name-status`; unusual diff settings can affect rename reporting.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep changes small, update the PRD or README when scope changes, and include the exact verification command in every pull request.

## Security

See [SECURITY.md](SECURITY.md). Do not include secrets, private tokens, proprietary dependency data, or sensitive logs in public issues or examples.

## License

MIT

## Release Verification

Before publishing or tagging a release, run the local verification path that matches CI:

- `npm run release:check`
- `npm run package:smoke`

The release checklist in `docs/release-readiness.md` captures the package surface, CLI bins, and reviewer notes for future release PRs.
