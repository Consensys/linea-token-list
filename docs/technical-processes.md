# Linea Token List - Technical Processes

This document provides an overview of the automated systems in place for managing the Linea Token List. It details the GitHub Actions set up for synchronization, validation, and testing, as well as the scripts executed for token updates, both community-initiated and auto-synced from on-chain data.

## GitHub Actions

This project uses GitHub Actions to routinely synchronize the on-chain token list, to validate JSON structures, and execute unit tests on changes to the main branch.

### 1. Sync on-chain Token List ([sync-mainnet-fulllist.yml](../.github/workflows/sync-mainnet-fulllist.yml))

#### Description:

Automatically syncs the on-chain token list every hour. For an in-depth execution flow, refer to the [Script Execution Guide](./script-execution.md).

#### Features:

- Runs hourly.
- Generates an updated token list from on-chain data.
- Creates a pull request if changes are detected.
- Auto-merges and cleans up the PR branch.

#### Sequence diagram

<div align="center">
    <img src="./mermaid/images/verify-mainnet-shortlist-action.svg" alt="Description for Community Token List updates" width="50%">
</div>

### 2. Validate and Test ([verify-and-test.yml](../.github/workflows/verify-and-test.yml))

#### Description:

Validates JSON structures and runs unit tests for every push and pull request on the main branch.

#### Features:

- Triggered by pushes and pull requests to the main branch.
- Validates linea-goerli-token-shortlist.json against its JSON schema.
- Executes unit tests.

#### Sequence diagram

<div align="center">
    <img src="./mermaid/images/verify-mainnet-shortlist-action.svg" alt="Description for Community Token List updates" width="50%">
</div>

## Script Execution

Technical workflows associated with updating the Linea Token List. It covers both community-initiated updates and automated synchronization from on-chain data.

### Community Token List updates

<div align="center">
    <img src="./mermaid/images/community-token-list-updates.svg" alt="Description for Community Token List updates" width="50%">
</div>

<b>Description</b>: This flowchart illustrates the step-by-step procedure through which community members can propose token updates. It begins with a user creating a new branch and ends with the pull request (PR) being merged after validation.

Mermaid source: [Community Token List updates diagram](./mermaid/diagrams/community-token-list-updates.mmd)

### Automatic Mainnet Token List Verification

<div align="center">
    <img src="./mermaid/images/verify-mainnet-shortlist.svg" alt="Automatic Mainnet Token List Verification" width="60%">
</div>

<b>Description</b>: The sequence diagram shows the hourly GitHub Action that retrieves the Mainnet Token Shortlist, verifies each token's on-chain data, updates any discrepancies, and gracefully terminates after the entire verification process.

Mermaid source: [Automatic Sync Mainnet Token List diagram](./mermaid/diagrams/verify-mainnet-shortlist.mmd)

### Automatic Sync Mainnet Token List

<div align="center">
    <img src="./mermaid/images/sync-mainnet-fulllist.svg" alt="Automatic Sync Mainnet Token List" width="90%">
</div>

<b>Description</b>: This diagram elucidates the automated process for synchronizing the Mainnet Token List directly from on-chain data. Triggered every hour, it encompasses stages from fetching event data from Ethereum to merging updates into the main branch after validation.

Mermaid source: [Automatic Sync Mainnet Token List diagram](./mermaid/diagrams/sync-mainnet-fulllist.mmd)
