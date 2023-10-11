# Linea Token List - Development Guide

This document provides guidelines and steps for setting up, developing, and managing the Linea Token List project.

## Quick Start

### Configuration Setup

1. Duplicate the Configuration:

```base
cp .env.template .env
```

2. API Key Setup:

Modify `.env` and substitute `<YOUR_INFURA_API_KEY>` with your actual Infura API Key.

### Dependency Installation

Install all the necessary packages via:

```bash
npm i
```

### Development Script Execution

Initialize the development script with:

```bash
npm run dev
```

### Production Script Execution

Initialize the production script with:

```bash
npm run start
```

## Unit tests

To perform unit tests, execute:

```bash
npm run test
```

## Managing GitHub Page

The GitHub page content is generated using [index.html](../index.html).

Use the `Live Server` extension in Visual Studio Code to preview this page.
