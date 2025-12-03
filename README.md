# Linea Token List

This repository maintains lists of ERC20 tokens available on Linea. There are two lists: one for Linea Mainnet and one
for Linea Sepolia. It is manually curated by our team, and updated based on submitted PRs via
the [Linea Developer Hub](https://developer.linea.build).

The information in this repository is also available in a [frontend app](https://consensys.github.io/linea-token-list/).

If you want to add a token or validate an addition, please follow the procedures outlined below.

## Add a token to the shortlist

If you represent a project with a token on Linea, it's beneficial to add it to the shortlist. Tokens on this list are
reflected in the UI of the Linea canonical bridge.

> [!IMPORTANT]
> Before adding a new token, you must verify the token's smart contract on an explorer. This ensures the authenticity
> and security of the token. You can verify the smart contract
> through [LineaScan](https://lineascan.build/verifyContract)
> or [other tools](https://docs.linea.build/get-started/how-to/verify-smart-contract).
> The same verification should be done on Ethereum L1 and Linea if necessary.

To add a new token, you need to go through the [Linea Developer Hub](https://developer.linea.build) registration process.

## Technical resources (for maintainers)

- [Development Guide](./docs/development.md).
