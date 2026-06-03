# atomcommit

atomcommit is an early-stage local-first developer tool.

## Status

This repository is early-stage. The README now reflects the current project intent from `docs/PRD.md`, but behavior should still be treated as pre-1.0 until implementation, examples, and release checks mature.

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

## Use

Start by reading the product notes and running the local checks:

```sh
sed -n '1,120p' docs/PRD.md
npm test
```

Generate an atomic commit plan from a repository with local changes:

```sh
atomcommit plan
atomcommit plan --json
atomcommit --version
```

## Verification

```sh
npm test
npm run check
npm run smoke
npm run package:smoke
npm run release:check
```

## Limitations

- The package is still a v0.1.0 project and may not expose a finished CLI or public API yet.
- Treat the PRD as direction, not a guarantee that every listed capability is implemented.
- Do not use the package for production security, compliance, or release decisions until tests and examples cover that workflow.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep changes small, update the PRD or README when scope changes, and include the exact verification command in every pull request.

## Security

See [SECURITY.md](SECURITY.md). Do not include secrets, private tokens, proprietary dependency data, or sensitive logs in public issues or examples.

## License

MIT
