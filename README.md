# Linea Token List

This repository maintains a list of ERC20 tokens available on Linea. The list is kept updated by the community.

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

```
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

| Name | Description | Type | Optional? |
| --- | --- | --- | --- |
| chainId | The typically used number identifier for the chain on which the token was issued | number | NO |
| chainURI | A resolvable URI to the genesis block of the chain on which the token was issued following the RFC 3986 standard | string | NO |
| tokenId | A resolvable URI of the token following the RFC 3986 standard to for example the deployment transaction of the token, or a DID identifying the token and its issuer | string | NO |
| tokenType | Describes the type of token (e.g: native, bridged…) | string | NO |
| address | Address of the token smart contract | string | NO |
| name | Token name | string | NO |
| symbol | Token symbol e.g. UNI | string | NO |
| decimals | Allowed number of decimals for the listed token | integer | NO |
| createdAt | Date and time token was created | string | NO |
| updateAt | Date and time token was updated | string | NO |
| logoURI | URI or URL of the token logo following the RFC 3986 standard | string | YES |
| extension | Extension to the token list entry to specify an origin chain if the token entry refers to another chain other than the origin chain of the token | Array | YES |
| rootChainId | The typically used number identifier for the root chain on which the token was originally issue | number | YES |
| rootChainURI | A resolvable URI to the genesis block of the root chain on which the token was originally issued following the RFC 3986 standard | string | YES |
| rootAddress | Root address of the token smart contract | string | YES |

<b>Note</b>: please ensure the completed JSON follows the schema outlined in [./json/schema/l2-token-list-schema.json](./json/schema/l2-token-list-schema.json). Make sure to add the token following alphabetical order of the `symbol` field.


3. Commit your changes and push your branch.

<b>Note</b>: Only commit the list file. Do not modify the schema or the templates.


4. Go to https://github.com/ConsenSys/linea-token-list/pulls and create a new PR. Make sure to set the base branch as `main`.

A GitHub Actions workflow will automatically verify the integrity of your JSON. If the check passes, validators will review the new list. If all the information are correct, they will approve the token addition.

In case of a failing check, refer to the error message in the [Actions](https://github.com/ConsenSys/linea-token-list/actions) tab. Make necessary modifications and try again.

## How to validate the new Token (for validators)

As a validator, you should:

1. Copy the JSON version template from [./json/templates/linea-goerli-token-version-template.json](./json/templates/linea-goerli-token-version-template.json).
2. Fill out the copied template with the new version's information.
3. Add the completed JSON to the versions array in [./json/linea-goerli-token-shortlist.json](./json/linea-goerli-token-shortlist.json).

Example:

```
{
  [...]
  "versions": [
    // Append the JSON here
  ]
}
```

4. Commit the changes and approve the PR.

Happy contributing!
