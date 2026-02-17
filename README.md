# Linea Token List

Curated lists of ERC-20 tokens available on Linea Mainnet and Linea Sepolia, used by
the [Linea canonical bridge](https://bridge.linea.build/) UI.

The lists are manually curated by the Linea team and updated based on submitted PRs via
the [Linea Developer Hub](https://developer.linea.build).

## Requirements

- [Node.js](https://nodejs.org/) v22.22.0 (see [`.nvmrc`](./.nvmrc))
- [npm](https://docs.npmjs.com/) v10.0.0+ (ships with Node.js; pinned to `10.9.2` via `packageManager`)

## Getting Started

```bash
cp .env.example .env   # configure optional provider URLs
npm install
npm test               # run the unit-test suite
```

## Development

See the full [Development Guide](./docs/development.md) for setup details, token addition
procedures, and guidelines.

### Common Commands

| Command                | Description                                                            |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm test`             | Run the unit-test suite (Jest)                                         |
| `npm run lint`         | Check for lint errors (ESLint)                                         |
| `npm run lint:fix`     | Auto-fix lint errors                                                   |
| `npm run prettier`     | Check formatting (Prettier)                                            |
| `npm run prettier:fix` | Auto-fix formatting                                                    |
| `npm run verify`       | Compile TypeScript, verify mainnet shortlist on-chain, and auto-format |

### Examples

```bash
# Verify the mainnet token list against on-chain data
npm run verify

# Lint and format in one shot
npm run lint:fix && npm run prettier:fix
```

## Project Structure

```text
linea-token-list/
├── .github/
│   ├── workflows/          # CI/CD workflow definitions
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   └── development.md      # Development guide and token-addition procedures
├── json/
│   ├── linea-mainnet-token-shortlist.json
│   ├── linea-sepolia-token-shortlist.json
│   ├── schema/
│   │   └── l2-token-list-schema.json
│   └── templates/
│       └── linea-sepolia-token-version-template.json
├── src/
│   ├── abis/               # ABI files (ERC-20, token bridge)
│   ├── config/             # App configuration and Joi schema
│   ├── logger/             # Winston logger setup
│   ├── models/             # TypeScript type definitions
│   ├── services/           # Core token verification service
│   └── utils/              # Helpers (validation, file I/O, Ethereum utils)
├── scripts/
│   └── verifyMainnetShortlist.ts  # Entry point for `npm run verify`
├── .env.example            # Environment variable template
├── eslint.config.js        # ESLint flat config
├── jest.config.js          # Jest configuration
├── tsconfig.json           # TypeScript configuration
└── package.json
```

**Key tooling:**

- **Package manager**: npm (strict engine enforcement via `.npmrc`)
- **Linting**: ESLint with `typescript-eslint`
- **Formatting**: Prettier
- **Testing**: Jest with `ts-jest`
- **Git hooks**: Husky (pre-commit runs lint + format check)

## CI/CD

### Continuous Integration

| Workflow                                                               | Trigger                       | Description                                                       |
| ---------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| [Test and Validate JSON](./.github/workflows/validate-json.yml)        | Push to `main`, PRs to `main` | TypeScript check, lint, tests, formatting, JSON schema validation |
| [Security Code Scanner](./.github/workflows/security-code-scanner.yml) | Push to `main`, PRs to `main` | MetaMask security code scanner                                    |

### Continuous Verification

| Workflow                                           | Trigger        | Description                                      |
| -------------------------------------------------- | -------------- | ------------------------------------------------ |
| [Verify JSON](./.github/workflows/verify-json.yml) | Push to `main` | Verifies mainnet shortlist against on-chain data |

## Add a Token to the Shortlist

If you represent a project with a token on Linea, it is beneficial to add it to the
shortlist. Tokens on this list are reflected in the UI of the Linea canonical bridge.

> **Important:** Before adding a new token, you must verify the token's smart contract on
> an explorer. This ensures the authenticity and security of the token. You can verify the
> smart contract through [LineaScan](https://lineascan.build/verifyContract)
> or [other tools](https://docs.linea.build/get-started/how-to/verify-smart-contract).
> The same verification should be done on Ethereum L1 and Linea if necessary.

To add a new token, go through the [Linea Developer Hub](https://developer.linea.build)
registration process.

For maintainers who need to add a token manually, see the
[Development Guide](./docs/development.md#manually-add-a-token-to-the-list).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Dual-licensed under [MIT](./LICENSE-MIT) or [Apache-2.0](./LICENSE-APACHE).
