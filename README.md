# Linea Token List

This repository maintains a list of ERC20 tokens available on Linea. The list is kept updated by the community. For comprehensive details and additional context, visit our [Linea Token List](https://consensys.github.io/linea-token-list/).

If you want to add a token or validate an addition, please follow the procedures outlined below.

## How to add a Token (for community)

To add a new Token,

1. `Fork` this repository to your own GitHub account, then `clone` your fork and create a new branch.

Example:

```
git clone https://github.com/<your-github-username>/linea-token-list.git
cd linea-token-list
git checkout -b feat/<token-name>
```

2. Fill out the [./json/linea-goerli-token-shortlist.json](./json/linea-goerli-token-shortlist.json) with your token's information.

Example:

```json
"tokens": [
...
{
  "chainId": 59140,
  "chainURI": "https://goerli.lineascan.build/block/0",
  "tokenId": "https://goerli.lineascan.build/token/0x7823e8dcc8bfc23ea3ac899eb86921f90e80f499",
  "tokenType": ["bridged"],
  "address": "0x7823e8dcc8bfc23ea3ac899eb86921f90e80f499",
  "name": "Uniswap",
  "symbol": "UNI",
  "decimals": 18,
  "createdAt": "2023-06-26",
  "updatedAt": "2023-06-26",
  "logoURI": "https://s2.coinmarketcap.com/static/img/coins/64x64/7083.png",
  "extension": {
    "rootChainId": 5,
    "rootChainURI": "https://goerli.etherscan.io/block/0",
    "rootAddress": "0x41E5E6045f91B61AACC99edca0967D518fB44CFB"
  }
}
...
]
```

Description of the fields:

| Name         | Description                                                                                                                                                         | type    | Required?                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| chainId      | The typically used number identifier for the chain on which the token was issued                                                                                    | number  | Mandatory                                                   |
| chainURI     | A resolvable URI to the genesis block of the chain on which the token was issued following the RFC 3986 standard                                                    | string  | Mandatory                                                   |
| tokenId      | A resolvable URI of the token following the RFC 3986 standard to for example the deployment transaction of the token, or a DID identifying the token and its issuer | string  | Mandatory                                                   |
| tokenType    | Describes the type of token (eg: `canonical-bridge`, `bridge-reserved`, `external-bridge`, `native`), see details bellow.                                           | string  | Mandatory                                                   |
| address      | Address of the token smart contract                                                                                                                                 | string  | Mandatory                                                   |
| name         | Token name                                                                                                                                                          | string  | Mandatory                                                   |
| symbol       | Token symbol e.g. UNI                                                                                                                                               | string  | Mandatory                                                   |
| decimals     | Allowed number of decimals for the listed token                                                                                                                     | integer | Mandatory                                                   |
| createdAt    | Date and time token was created                                                                                                                                     | string  | Mandatory                                                   |
| updateAt     | Date and time token was last updated                                                                                                                                | string  | Mandatory                                                   |
| logoURI      | URI or URL of the token logo following the RFC 3986 standard                                                                                                        | string  | Optional                                                    |
| extension    | Extension to specify information about the token on its native chain if it was bridged                                                                              | Array   | Mandatory if the token has been bridged, otherwise optional |
| rootChainId  | The typically used number identifier for the chain on which the token was originally issued                                                                         | number  | Mandatory if the token has been bridged, otherwise optional |
| rootChainURI | A resolvable URI to the genesis block of the root chain on which the token was originally issued following the RFC 3986 standard                                    | string  | Mandatory if the token has been bridged, otherwise optional |
| rootAddress  | Address of the token on its native chain                                                                                                                            | string  | Mandatory if the token has been bridged, otherwise optional |

Token types:

- `canonical-bridge`: token originally on Ethereum, which has been bridged to Linea with <b>Linea Canonical Bridge</b>.

  These tokens are automatically discovered.

  <b>Example</b>: DAI on Ethereum Mainnet has this address `0x6b175474e89094c44da98b954eedeac495271d0f`, after being bridged on Linea it has this address `0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5`

- `bridge-reserved`: token reserved in the canonical bridge smart contract to prevent any bridged <b>Linea Canonical Bridge</b>.

  This type needs to be added manually.

  <b>Example</b>: USDC, WETH.

- `external-bridge`: token bridged on another layer (Ethereum in general) and Linea using a custom protocol bridge.

  This type needs to be added manually.

  <b>Example</b>: PEEL, USDC.

- `native`: Token first created on Linea.

  This type needs to be added manually.

  <b>Example</b>: WETH.

<b>Additional guidelines</b>:

- Please ensure the completed JSON follows the schema outlined in [./json/schema/l2-token-list-schema.json](./json/schema/l2-token-list-schema.json).
- Make sure to add the token following alphabetical order of the `symbol` field.
- Update the `updatedAt` (and potentially `createdAt`) fields for the file and the token
- Update the file version:
  - Increase `patch` when modifying information of an existing token.
  - Increase `minor` when modifying adding a new token.
  - Increase `major` when changing the structure of the file.

3. Commit your changes and push your branch.

<b>Note</b>: Only commit the list file. Do not modify the schema or the templates.

4. Go to https://github.com/ConsenSys/linea-token-list/pulls and create a new PR. Make sure to set the base branch as `main`.

A GitHub Actions workflow will automatically verify the integrity of your JSON. If the check passes, validators will review the new list. If all the information are correct, they will approve the token addition.

In case of a failing check, refer to the error message in the [Actions](https://github.com/ConsenSys/linea-token-list/actions) tab. Make necessary modifications and try again.

Happy contributing!

## Technical Resources (for Maintainers)

- [Development Guide](./docs/development.md).
- [Technical Processes](./docs/technical-processes.md).
