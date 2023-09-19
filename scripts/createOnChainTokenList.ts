import { ethers } from 'ethers';
import fs from 'fs';
import axios from 'axios';
import { createLogger, transports, format } from 'winston';
require('dotenv').config();

interface TokenInfo {
  chainId: number;
  chainURI: string;
  tokenId: string;
  tokenType: string[];
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  createdAt: string;
  updatedAt: string;
  logoURI?: string;
  extension?: {
    rootChainId: number;
    rootChainURI: string;
    rootAddress: string;
  };
}
// Logger
const logger = createLogger({
  level: 'info',
  format: format.combine(format.colorize(), format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

// Configuration
const config = {
  PROVIDER_URL: process.env.PROVIDER_URL,
  LINEA_PROVIDER_URL: process.env.LINEA_PROVIDER_URL,
  CONTRACT_ADDRESS: '0x051F1D88f0aF5763fB888eC4378b4D8B29ea3319',
  L2_CONTRACT_ADDRESS: '0x353012dc4a9A6cF55c941bADC267f82004A8ceB9',
  CONTRACT_ABI_PATH: 'scripts/abi/token-bridge-abi.json',
  ERC20_ABI_PATH: 'scripts/abi/ERC20-abi.json',
  ERC20_BYTE32_ABI_PATH: 'scripts/abi/ERC20-byte32-abi.json',
  TOKEN_LIST_PATH: 'json/linea-mainnet-token-fulllist.json',
};

// Providers
const provider = new ethers.providers.JsonRpcProvider(config.PROVIDER_URL);
const lineaProvider = new ethers.providers.JsonRpcProvider(config.LINEA_PROVIDER_URL);

// Load contract ABIs
const contractABI = loadABI(config.CONTRACT_ABI_PATH);
const erc20ContractABI = loadABI(config.ERC20_ABI_PATH);
const erc20Byte32ContractABI = loadABI(config.ERC20_BYTE32_ABI_PATH);

// Contract instances
const contract = new ethers.Contract(config.CONTRACT_ADDRESS, contractABI, provider);
const l2Contract = new ethers.Contract(config.L2_CONTRACT_ADDRESS, contractABI, lineaProvider);

// Event filters
const newTokenEventFilter = contract.filters.NewToken();
const newTokenDeployedEventFilter = contract.filters.NewTokenDeployed();

// Token info storage
const tokenInfoArray: TokenInfo[] = [];
const uniqueTokenAddresses = new Set<string>();

// Read existing token list
const existingTokenList = readExistingTokenList();

if (!existingTokenList.tokens) {
  existingTokenList.tokens = [];
}

// Add existing tokens to the set
for (const token of existingTokenList.tokens) {
  if (token.chainId === 59144) {
    uniqueTokenAddresses.add(token.extension?.rootAddress.toLowerCase());
  } else if (token.chainId === 1) {
    uniqueTokenAddresses.add(token.address.toLowerCase());
  }
}

// Main function
async function main() {
  try {
    const newTokenEvents = await contract.queryFilter(newTokenEventFilter);
    const newTokenDeployedEvents = await contract.queryFilter(newTokenDeployedEventFilter);

    await processTokenEvents(newTokenEvents);
    await processTokenEvents(newTokenDeployedEvents, true);

    updateTokenList(tokenInfoArray);
  } catch (error) {
    logger.error(`Error while reading events: ${error}`);
  }
}

// Process token events
async function processTokenEvents(events: ethers.Event[], isDeployedEvent: boolean = false): Promise<void> {
  for (const event of events) {
    try {
      let tokenAddress = event?.args?.token;
      let nativeTokenAddress;
      if (isDeployedEvent) {
        tokenAddress = event?.args?.bridgedToken;
        nativeTokenAddress = event?.args?.nativeToken;
      }

      if (!tokenAddress) {
        logger.info("Event doesn't contain a valid token address.");
        continue; // Skip this event and continue with the next one
      }

      let tokenContract = new ethers.Contract(tokenAddress, erc20ContractABI, provider);

      let tokenInfo: TokenInfo | undefined;

      try {
        tokenInfo = await fetchTokenInfo(tokenContract, tokenAddress);
      } catch (error) {
        logger.info(`Error calling contract with ERC20 ABI: ${error}`);

        const tokenContractAlt = new ethers.Contract(tokenAddress, erc20Byte32ContractABI, provider);
        try {
          tokenInfo = await fetchTokenInfo(tokenContractAlt, tokenAddress, true);
        } catch (error) {
          logger.info(`Error calling contract with ERC20 Byte32 ABI: ${error}`);
          continue;
        }
      }

      if (tokenInfo) {
        logger.info(tokenInfo);
        const tokenAddressLowerCase = tokenAddress.toLowerCase();
        const LINEA_MAINNET_CHAIN_ID = 59144;
        const ETHEREUM_MAINNET_CHAIN_ID = 1;

        if (isDeployedEvent) {
          tokenInfo.address = tokenAddress;
          tokenInfo.chainId = ETHEREUM_MAINNET_CHAIN_ID;
          tokenInfo.chainURI = 'https://etherscan.io/block/0';
          tokenInfo.tokenId = `https://etherscan.io/address/${tokenAddress}`;
          if (tokenInfo.extension) {
            tokenInfo.extension.rootChainId = LINEA_MAINNET_CHAIN_ID;
            tokenInfo.extension.rootChainURI = 'https://lineascan.build/block/0';
            tokenInfo.extension.rootAddress = nativeTokenAddress;
          }
        } else {
          const address = await getTokenAddressFromMapping(tokenAddressLowerCase);
          tokenInfo.address = address;
          tokenInfo.tokenId = `https://lineascan.build/address/${address}`;
          if (tokenInfo.chainId === 1) {
            uniqueTokenAddresses.add(tokenInfo.address.toLowerCase()); // Add address when chainId is 1
          }
        }

        if (tokenAddressLowerCase && !uniqueTokenAddresses.has(tokenAddressLowerCase)) {
          uniqueTokenAddresses.add(tokenAddressLowerCase);
          tokenInfoArray.push(tokenInfo);
        }
      }
    } catch (error) {
      logger.error(`Error processing token event: ${error}`);
    }
  }
}

// Fetch token info
async function fetchTokenInfo(
  tokenContract: ethers.Contract,
  tokenAddress: string,
  isERC20Byte32: boolean = false
): Promise<TokenInfo> {
  const [symbol, decimals, name] = await Promise.all([
    tokenContract.symbol(),
    tokenContract.decimals(),
    tokenContract.name(),
  ]);

  let parsedSymbol = symbol;
  let parsedName = name;

  if (isERC20Byte32) {
    // If it's an ERC20 Byte32 contract, parse bytes32 for symbol and name
    parsedSymbol = ethers.utils.parseBytes32String(symbol);
    parsedName = ethers.utils.parseBytes32String(name);
  }

  const tokenInfo: TokenInfo = {
    chainId: 59144,
    chainURI: 'https://lineascan.build/block/0',
    tokenId: 'https://lineascan.build/address/',
    tokenType: ['bridged'],
    address: '',
    name: parsedName,
    symbol: parsedSymbol,
    decimals: Number(decimals),
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    extension: {
      rootChainId: 1,
      rootChainURI: 'https://etherscan.io',
      rootAddress: tokenAddress,
    },
  };

  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/1/contract/${tokenAddress.toLowerCase()}`);
    const logoURIfromCoingecko = response.data.image.large;

    if (logoURIfromCoingecko) {
      tokenInfo.logoURI = logoURIfromCoingecko;
    }
  } catch (error) {
    logger.info(`Error fetching logoURI from CoinGecko: ${error}`);
  }

  return tokenInfo;
}

// Load ABI from file
function loadABI(abiPath: string): any {
  try {
    const abi = JSON.parse(fs.readFileSync(abiPath).toString());
    return abi;
  } catch (error) {
    logger.error(`Error loading ABI from ${abiPath}: ${error}`);
    throw error;
  }
}

// Get current date as string
function getCurrentDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Update token list
function updateTokenList(tokenInfoArray: TokenInfo[]): void {
  try {
    const existingTokenList = readExistingTokenList();

    if (!existingTokenList.tokens) {
      existingTokenList.tokens = [];
    }

    const existingTokenAddresses = new Set<string>();

    for (const token of existingTokenList.tokens) {
      if (token.chainId === 59144) {
        existingTokenAddresses.add(token.extension?.rootAddress.toLowerCase());
      } else if (token.chainId === 1) {
        existingTokenAddresses.add(token.address.toLowerCase());
      }
    }

    // Filter out tokens that are already in the existing token list

    const newTokens = tokenInfoArray.filter((info) => {
      const addressLowerCase = info.extension?.rootAddress?.toLowerCase();
      return addressLowerCase && !existingTokenAddresses.has(addressLowerCase);
    });

    // Check if there are new tokens to add
    if (newTokens.length > 0) {
      existingTokenList.tokens = [...existingTokenList.tokens, ...newTokens];
      existingTokenList.updatedAt = getCurrentDate();
      const versions = existingTokenList.versions[0];
      versions.minor += 1; // Increment the minor version
      saveTokenList(existingTokenList);
    }
  } catch (error) {
    logger.error(`Error updating token list: ${error}`);
  }
}

// Read existing token list
function readExistingTokenList(): any {
  try {
    const existingTokenList = JSON.parse(fs.readFileSync(config.TOKEN_LIST_PATH).toString());
    return existingTokenList;
  } catch (error) {
    logger.error(`Error reading existing token list file: ${error}`);
    return {};
  }
}

// Get token address from mapping
async function getTokenAddressFromMapping(nativeAddress: string): Promise<string> {
  try {
    const tokenAddress = await l2Contract.nativeToBridgedToken(1, nativeAddress);
    return tokenAddress;
  } catch (error) {
    logger.error(`Error calling nativeToBridgedToken: ${error}`);
    throw error;
  }
}

// Save token list
function saveTokenList(tokenListData: any): void {
  fs.writeFileSync(config.TOKEN_LIST_PATH, JSON.stringify(tokenListData, null, 2));
}

// Execute the script
main();
