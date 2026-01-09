import { type PublicClient, type Abi, type Address, type Hex, getAddress, hexToString } from 'viem';
import diff from 'deep-diff';

import { ABIType, LineaTokenList, Token } from 'src/models/token';
import { isEqual } from './compare';
import { logger } from 'src/logger';
import { readJsonFile, saveJsonFile } from './file';
import { getBumpedVersions } from './list';
import { getCurrentDate } from './date';

/**
 * Fetches the token info from an ERC20 contract
 * @param client - Viem PublicClient
 * @param address - Token contract address
 * @param abi - ERC20 ABI to use
 * @param abiType - Whether to parse as bytes32 or string
 * @returns Token object with fetched info
 */
export async function fetchTokenInfo(
  client: PublicClient,
  address: Address,
  abi: Abi,
  abiType: ABIType
): Promise<Token> {
  const [name, symbol, decimals] = await Promise.all([
    client.readContract({ address, abi, functionName: 'name' }),
    client.readContract({ address, abi, functionName: 'symbol' }),
    client.readContract({ address, abi, functionName: 'decimals' }),
  ]);

  let parsedName: string;
  let parsedSymbol: string;

  // If it's an ERC20 Byte32 contract, parse bytes32 for symbol and name
  if (abiType === ABIType.BYTE32) {
    parsedName = hexToString(name as Hex, { size: 32 }).replace(/\0/g, '');
    parsedSymbol = hexToString(symbol as Hex, { size: 32 }).replace(/\0/g, '');
  } else {
    parsedName = name as string;
    parsedSymbol = symbol as string;
  }

  return {
    chainId: 0,
    chainURI: '',
    tokenId: '',
    tokenType: [],
    address: '',
    name: parsedName,
    symbol: parsedSymbol,
    decimals: Number(decimals),
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    extension: {
      rootChainId: 1,
      rootChainURI: '',
      rootAddress: getAddress(address),
    },
  };
}

/**
 * Checks if the token exists in the token list
 * @param tokenList - List of tokens to search
 * @param tokenAddress - Address to look for
 * @returns Token if found, undefined otherwise
 */
export const checkTokenExists = (tokenList: Token[], tokenAddress: string): Token | undefined => {
  const token = tokenList.find((token: Token) => token.address === tokenAddress);
  if (token && token.extension?.rootAddress) {
    return token;
  }
  const tokenExtension = tokenList.find((token: Token) => token.extension?.rootAddress === tokenAddress);
  if (tokenExtension && tokenExtension.address) {
    return tokenExtension;
  }
};

/**
 * Updates the token list if modifications are found
 * @param path - Path to the token list JSON file
 * @param originalList - Original token list
 * @param checkTokenList - Token list to compare against
 */
export const updateTokenListIfNeeded = (path: string, originalList: LineaTokenList, checkTokenList: Token[]): void => {
  if (isEqual(originalList.tokens, checkTokenList)) {
    logger.info('Token list matching');
  } else {
    const tokenList = readJsonFile(path);
    const differences = diff(originalList.tokens, checkTokenList);
    const newTokenList = {
      ...tokenList,
      updatedAt: getCurrentDate(),
      versions: getBumpedVersions(tokenList.versions),
      tokens: checkTokenList,
    };
    saveJsonFile(path, newTokenList);
    logger.info('Token list updated', { path, differences });
  }
};

/**
 * Checks if the token fields match
 * @param token - Token from JSON
 * @param verifiedToken - Token from chain
 */
export const checkTokenErrors = (token: Token, verifiedToken: Token): void => {
  validateTokenField('address', token.address, verifiedToken.address, token.name);
  validateTokenField('rootAddress', token.extension?.rootAddress, verifiedToken.extension?.rootAddress, token.name);
  validateTokenField('symbol', token.symbol, verifiedToken.symbol, token.name);
  validateTokenField('decimals', token.decimals, verifiedToken.decimals, token.name);
  validateTokenField('chainId', token.chainId, verifiedToken.chainId, token.name);
  validateTokenField('rootChainId', token.extension?.rootChainId, verifiedToken.extension?.rootChainId, token.name);
};

/**
 * Compares the original token with the verified token
 * @param fieldName - Field being validated
 * @param originalValue - Value from JSON
 * @param verifiedValue - Value from chain
 * @param tokenName - Token name for logging
 */
const validateTokenField = (
  fieldName: string,
  originalValue: string | number | undefined,
  verifiedValue: string | number | undefined,
  tokenName: string
): void => {
  if (originalValue !== verifiedValue) {
    const message = `${fieldName} mismatch`;
    logger.error(message, {
      name: tokenName,
      [`current${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`]: originalValue,
      [`new${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`]: verifiedValue,
    });
    throw new Error(message);
  }
};
