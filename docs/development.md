# Linea Token List -- Development Guide

This document provides guidelines and steps for setting up, developing, and managing
the Linea Token List project.

## Quick Start

```bash
cp .env.example .env   # configure optional provider URLs
npm install
npm test               # run the unit-test suite
```

## Configuration

Duplicate the example configuration:

```bash
cp .env.example .env
```

Provider URLs are optional. If not provided, the verification script automatically falls
back to public RPC endpoints (Llama, Ankr, PublicNode for Ethereum; the official Linea
RPC for Linea). To use Infura, replace `<YOUR_INFURA_API_KEY>` in `.env` with your
actual Infura API key.

See the [Environment Variables](#environment-variables) section for a full reference.

## Scripts

| Command                | Description                                                            |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm test`             | Run the unit-test suite (Jest)                                         |
| `npm run lint`         | Check for lint errors (ESLint)                                         |
| `npm run lint:fix`     | Auto-fix lint errors                                                   |
| `npm run prettier`     | Check formatting (Prettier)                                            |
| `npm run prettier:fix` | Auto-fix formatting                                                    |
| `npm run verify`       | Compile TypeScript, verify mainnet shortlist on-chain, and auto-format |

## Environment Variables

| Variable              | Required | Default                                      | Description                                     |
| --------------------- | -------- | -------------------------------------------- | ----------------------------------------------- |
| `NODE_ENV`            | No       | --                                           | Set to `development` for verbose logging        |
| `PROVIDER_URL`        | No       | Public endpoints                             | Ethereum L1 JSON-RPC provider URL (e.g. Infura) |
| `LINEA_PROVIDER_URL`  | No       | Public endpoints                             | Linea L2 JSON-RPC provider URL (e.g. Infura)    |
| `CONTRACT_ADDRESS`    | No       | `0x051F1D88f0aF5763fB888eC4378b4D8B29ea3319` | L1 token bridge contract address                |
| `L2_CONTRACT_ADDRESS` | No       | `0x353012dc4a9A6cF55c941bADC267f82004A8ceB9` | L2 token bridge contract address                |

## Manually Add a Token to the List

1. Edit [`json/linea-mainnet-token-shortlist.json`](../json/linea-mainnet-token-shortlist.json)
   (or [`json/linea-sepolia-token-shortlist.json`](../json/linea-sepolia-token-shortlist.json)
   for testnet) with the token information. Make sure you follow the
   [guidelines](#guidelines) below.

   Example entry:

   ```json
   {
     "chainId": 59144,
     "chainURI": "https://lineascan.build/block/0",
     "tokenId": "https://lineascan.build/address/0x...",
     "tokenType": ["canonical-bridge"],
     "address": "0x...",
     "name": "Token Name",
     "symbol": "TKN",
     "decimals": 18,
     "createdAt": "2025-01-15",
     "updatedAt": "2025-01-15",
     "logoURI": "https://s2.coinmarketcap.com/static/img/coins/64x64/0000.png",
     "extension": {
       "rootChainId": 1,
       "rootChainURI": "https://etherscan.io/block/0",
       "rootAddress": "0x..."
     }
   }
   ```

2. Commit your changes and push your branch.

   > **Note:** Only commit the list file. Do not modify the schema or the templates.

3. Go to the [pull requests page](https://github.com/Consensys/linea-token-list/pulls)
   and create a new PR. Make sure to set the base branch as `main`.

A GitHub Actions workflow automatically verifies the integrity of your JSON. If the check
passes, validators will review the new list. If all the information is correct, they will
approve the token addition.

If a check fails, refer to the error message in the
[Actions](https://github.com/Consensys/linea-token-list/actions) tab. Make any necessary
modifications and try again.

## Token Entry Fields

| Field                    | Type     | Required    | Description                                                                       |
| ------------------------ | -------- | ----------- | --------------------------------------------------------------------------------- |
| `chainId`                | number   | Yes         | Chain identifier where the token was issued                                       |
| `chainURI`               | string   | Yes         | Resolvable URI to the genesis block of the chain (RFC 3986)                       |
| `tokenId`                | string   | Yes         | Resolvable URI to the token deployment transaction or DID (RFC 3986)              |
| `tokenType`              | string[] | Yes         | Token type(s): `canonical-bridge`, `bridge-reserved`, `external-bridge`, `native` |
| `address`                | string   | Yes         | Token smart contract address                                                      |
| `name`                   | string   | Yes         | Token name                                                                        |
| `symbol`                 | string   | Yes         | Token symbol (e.g. `UNI`)                                                         |
| `decimals`               | integer  | Yes         | Number of decimals                                                                |
| `createdAt`              | string   | Yes         | Date when the token was added to the list                                         |
| `updatedAt`              | string   | Yes         | Date when the token listing was last updated                                      |
| `logoURI`                | string   | No          | URI or URL of the token logo (RFC 3986)                                           |
| `extension`              | object   | Conditional | Required if the token has been bridged                                            |
| `extension.rootChainId`  | number   | Conditional | Chain identifier of the token's native chain                                      |
| `extension.rootChainURI` | string   | Conditional | URI to the genesis block of the native chain                                      |
| `extension.rootAddress`  | string   | Conditional | Token address on its native chain                                                 |

## Token Types

- **`canonical-bridge`** -- Token originally on Ethereum, bridged to Linea with the
  [Linea canonical bridge](https://bridge.linea.build/) (also known as the native bridge).

  _Example:_ DAI on Ethereum (`0x6b175474e89094c44da98b954eedeac495271d0f`) bridged to
  Linea (`0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5`).

- **`bridge-reserved`** -- Token reserved in the canonical bridge smart contract to
  prevent bridging via the Linea canonical bridge. Must be added manually.

  _Example:_ USDC, WETH.

- **`external-bridge`** -- Token bridged between another layer (usually Ethereum) and
  Linea using a third-party bridge protocol. Must be added manually.

  _Example:_ PEEL, USDC.

- **`native`** -- Token first created on Linea. Must be added manually.

  _Example:_ WETH.

## Guidelines

- Entries must conform to the JSON schema at
  [`json/schema/l2-token-list-schema.json`](../json/schema/l2-token-list-schema.json).
- Tokens are automatically sorted alphabetically by `name` when saved.
- Update the `updatedAt` field (and `createdAt` if applicable) for both the file and the
  token entry.
- Update the file version:
  - Increase `patch` when modifying information of an existing token.
  - Increase `minor` when adding a new token.
  - Increase `major` when changing the structure of the file.

## License

Dual-licensed under [MIT](../LICENSE-MIT) or [Apache-2.0](../LICENSE-APACHE).
