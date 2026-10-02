# @hathq/sem-lang-surface-html

Extract structural evidence from HTML without executing the page.

## What you can do

- Parse an inert HTML syntax tree.
- Produce bounded source-linked structural evidence.

## Current scope

This parser does not run scripts, load a browser page or assign semantic meaning.

Package distribution is not activated by this documentation. Use the checked-in source and the declared dependency versions; published availability must be verified separately.

## Getting started

The manifest currently requires locally supplied package archives: `@hathq/sem-lang-structured-surface`. These archives are excluded from Git. Obtain the exact approved dependency artifacts before installing; a fresh clone alone is not sufficient. Registry distribution remains pending.

Use the package manager matching the checked-in lockfile and the Node.js version declared in `package.json` or the development configuration. Run from this repository:

```sh
npm install
npm run test
```

## Documentation and source

[Usage guide](docs/getting-started.md)

[Implementation and public interfaces](src) · [Verification cases](test) · [Contributing](CONTRIBUTING.md) · [Security reporting](SECURITY.md) · [License](LICENSE) · [Attribution notices](NOTICE)
