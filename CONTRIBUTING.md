# Contributing to Linea Token List

Thank you for your interest in contributing to the Linea Token List. This guide covers
the development workflow for maintainers and external contributors.

## Prerequisites

See the [Requirements](./README.md#requirements) section in the README.

## Getting Started

```bash
git clone git@github.com:Consensys/linea-token-list.git
cd linea-token-list
cp .env.example .env
npm install
```

## Development Workflow

1. Create a feature branch from `main`:

   ```bash
   git checkout -b feat/add-token-xyz
   ```

2. Make your changes (see the [Development Guide](./docs/development.md) for token
   addition procedures and guidelines).

3. Run quality checks before committing:

   ```bash
   npm run lint
   npm run prettier
   npm test
   ```

   The pre-commit hook runs lint and formatting checks automatically.

4. Commit your changes and push the branch:

   ```bash
   git add .
   git commit -m "feat: add XYZ token to mainnet shortlist"
   git push -u origin feat/add-token-xyz
   ```

5. Open a pull request against `main` on
   [GitHub](https://github.com/Consensys/linea-token-list/pulls). Fill in the
   [PR template](./.github/PULL_REQUEST_TEMPLATE.md).

## Code Quality

| Check             | Command                | Description                                     |
| ----------------- | ---------------------- | ----------------------------------------------- |
| Lint              | `npm run lint`         | ESLint checks on TypeScript source              |
| Lint (auto-fix)   | `npm run lint:fix`     | Auto-fix lint errors                            |
| Format            | `npm run prettier`     | Prettier formatting check                       |
| Format (auto-fix) | `npm run prettier:fix` | Auto-fix formatting                             |
| Tests             | `npm test`             | Jest unit tests                                 |
| Verify            | `npm run verify`       | Full on-chain verification of mainnet shortlist |

## PR Guidelines

- Use the [PR template](./.github/PULL_REQUEST_TEMPLATE.md).
- Only commit the token list file(s). Do not modify the schema or templates.
- Ensure CI checks pass before requesting review.
- Keep one token addition per PR unless batch additions are coordinated with maintainers.

## License

By contributing, you agree that your contributions will be licensed under the same
[MIT OR Apache-2.0](./README.md#license) dual license as the project.
