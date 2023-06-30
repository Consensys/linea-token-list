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

2. Copy the JSON token template from [./json/templates/linea-goerli-token-template.json](./json/templates/linea-goerli-token-template.json).
3. Fill out the copied template with your token's information.

<b>Note</b>: please ensure the completed JSON follows the schema outlined in [./json/schema/l2-token-list-schema.json](./json/schema/l2-token-list-schema.json).

4. Add the completed JSON to the `tokens` array in [./json/linea-goerli-token-shortlist.json](./json/linea-goerli-token-shortlist.json). Make sure to add the token following alphabetical order of the `symbol` field.

```
{
  [...]
  "tokens": [
    // Append the JSON here
  ]
}
```

5. Commit your changes and push your branch.

<b>Note</b>: Only commit the list file. Do not modify the schema or the templates.

Example:

```
git add ./json/linea-goerli-token-shortlist.json
git commit -m "feat: new token <name>"
git push origin feat/<token-name>
```

6. Go to https://github.com/ConsenSys/linea-token-list/pulls and click on `New pull request` to create a new PR. Make sure to set the base branch as `main`.

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
