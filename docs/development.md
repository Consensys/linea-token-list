# Linea Token List - Development Guide

This document provides guidelines and steps for setting up, developing, and managing the Linea Token List project.

## Quick Start

### Configuration Setup

1. Duplicate the Configuration:

```bash
cp .env.example .env
```

2. API Key Setup (Optional):

Modify `.env` and substitute `<YOUR_INFURA_API_KEY>` with your actual Infura API Key.

> [!NOTE]
> Provider URLs are optional. If not provided, the verification script will automatically fallback to public RPC
> endpoints (Llama, Ankr, PublicNode for Ethereum; Linea official RPC for Linea).

### Dependency Installation

Install all the necessary packages via:

```bash
npm i
```

### Scripts Execution

<b>Verify mainnet shortlist</b>

Run the production script with:

```bash
npm run verify
```

## Unit tests

To perform unit tests, execute:

```bash
npm run test
```

## Lint

To perform lint, execute:

```bash
npm run lint
```

## Manually add a token to the list

1. Fill out the [linea-mainnet-token-shortlist.json](./json/linea-mainnet-token-shortlist.json) with the token's
   information. Make sure you adhere to the [guidelines](#guidelines).

Example:

```json
"tokens": [
    ...
    {
        "chainId": 59141,
        "chainURI": "https://sepolia.lineascan.build/block/0",
        "tokenId": "https://sepolia.lineascan.build/address/0xFEce4462D57bD51A6A552365A011b95f0E16d9B7",
        "tokenType": ["bridge-reserved", "external-bridge"],
        "address": "0xFEce4462D57bD51A6A552365A011b95f0E16d9B7",
        "name": "USD//C",
        "symbol": "USDC",
        "decimals": 6,
        "createdAt": "2024-03-27",
        "updatedAt": "2024-10-01",
        "logoURI": "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
        "extension": {
            "rootChainId": 11155111,
            "rootChainURI": "https://sepolia.etherscan.io/block/0",
            "rootAddress": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
        }
    }
    ...
]
```

Fields:

| Name         | Description                                                                                                                                                         | type    | Required?                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| chainId      | The typically used number identifier for the chain on which the token was issued                                                                                    | number  | Mandatory                                                   |
| chainURI     | A resolvable URI to the genesis block of the chain on which the token was issued following the RFC 3986 standard                                                    | string  | Mandatory                                                   |
| tokenId      | A resolvable URI of the token following the RFC 3986 standard to for example the deployment transaction of the token, or a DID identifying the token and its issuer | string  | Mandatory                                                   |
| tokenType    | Describes the type of token (eg: `canonical-bridge`, `bridge-reserved`, `external-bridge`, `native`), see details below.                                            | string  | Mandatory                                                   |
| address      | Address of the token smart contract                                                                                                                                 | string  | Mandatory                                                   |
| name         | Token name                                                                                                                                                          | string  | Mandatory                                                   |
| symbol       | Token symbol e.g. UNI                                                                                                                                               | string  | Mandatory                                                   |
| decimals     | Allowed number of decimals for the listed token                                                                                                                     | integer | Mandatory                                                   |
| createdAt    | Date when the token was added to the list                                                                                                                           | string  | Mandatory                                                   |
| updatedAt    | Date when the token listing was updated                                                                                                                             | string  | Mandatory                                                   |
| logoURI      | URI or URL of the token logo following the RFC 3986 standard                                                                                                        | string  | Optional                                                    |
| extension    | Extension to specify information about the token on its native chain if it was bridged                                                                              | Array   | Mandatory if the token has been bridged, otherwise optional |
| rootChainId  | The typically used number identifier for the chain on which the token was originally issued                                                                         | number  | Mandatory if the token has been bridged, otherwise optional |
| rootChainURI | A resolvable URI to the genesis block of the root chain on which the token was originally issued following the RFC 3986 standard                                    | string  | Mandatory if the token has been bridged, otherwise optional |
| rootAddress  | Address of the token on its native chain                                                                                                                            | string  | Mandatory if the token has been bridged, otherwise optional |

Token types:

- `canonical-bridge`: token originally on Ethereum, which has been bridged to Linea with
  the [Linea canonical bridge](https://bridge.linea.build/) (also known as the native bridge).

  **Example**: DAI on Ethereum Mainnet has this address `0x6b175474e89094c44da98b954eedeac495271d0f`, after being
  bridged on Linea it has this address `0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5`

- `bridge-reserved`: token reserved in the canonical bridge smart contract to prevent any bridged **Linea Canonical
  Bridge**.

  This type needs to be added manually.

  **Example**: USDC, WETH.

- `external-bridge`: token bridged on another layer (Ethereum in general) and Linea using a custom protocol bridge.

  This type needs to be added manually.

  **Example**: PEEL, USDC.

- `native`: Token first created on Linea.

  This type needs to be added manually.

  **Example**: WETH.

3. Commit your changes and push your branch.

> [!NOTE]
> Only commit the list file. Do not modify the schema or the templates.

4. Go to the [pull requests page](https://github.com/ConsenSys/linea-token-list/pulls) and create a new PR. Make sure to
   set the base branch as `main`.

A GitHub Actions workflow will automatically verify the integrity of your JSON. If the check passes, validators will
review the new list. If all the information are correct, they will approve the token addition.

In case of a failing check, refer to the error message in
the [Actions](https://github.com/ConsenSys/linea-token-list/actions) tab. Make necessary modifications and try again.

Happy contributing!

## Guidelines

- Please ensure the completed JSON follows the schema outlined
  in [./json/schema/l2-token-list-schema.json](./json/schema/l2-token-list-schema.json).
- Make sure to add the token following alphabetical order of the `name` field. Tokens are automatically sorted by name when saved.
- Update the `updatedAt` (and potentially `createdAt`) fields for the file and the token
- Update the file version:
  - Increase `patch` when modifying information of an existing token.
  - Increase `minor` when adding a new token.
  - Increase `major` when changing the structure of the file.
