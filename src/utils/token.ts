import { Contract, Event, utils } from 'ethers';
import diff from 'deep-diff';
import _ from 'lodash';

import { ABIType, LineaTokenList, Token } from 'src/models/token';
import { logger } from 'src/logger';
import { readJsonFile, saveJsonFile } from './file';
import { getBumpedVersions } from './list';
import { getCurrentDate } from './date';

/**
 * Returns the token address and native token address from an event
 * @param event
 * @returns
 */
export const getEventTokenAddresses = (event: Event): { tokenAddress: string; nativeTokenAddress: string } => {
  const tokenAddress = event?.args?.bridgedToken && utils.getAddress(event.args.bridgedToken);
  const nativeTokenAddress = event?.args?.nativeToken && utils.getAddress(event?.args?.nativeToken);

  return { tokenAddress, nativeTokenAddress };
};

/**
 * Fetches the token info from the contract
 * @param erc20Contract
 * @param eventName
 * @returns
 */
export async function fetchTokenInfo(erc20Contract: Contract, abiType: ABIType): Promise<Token> {
  const [name, symbol, decimals] = await Promise.all([
    erc20Contract.name(),
    erc20Contract.symbol(),
    erc20Contract.decimals(),
  ]);

  let parsedSymbol = symbol;
  let parsedName = name;

  // If it's an ERC20 Byte32 contract, parse bytes32 for symbol and name
  if (abiType === ABIType.BYTE32) {
    parsedName = utils.parseBytes32String(name);
    parsedSymbol = utils.parseBytes32String(symbol);
  }

  const defaultTokenInfo: Token = {
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
      rootAddress: utils.getAddress(erc20Contract.address),
    },
  };

  return defaultTokenInfo;
}

/**
 * Checks if the token exists in the token list
 * @param tokenList
 * @param tokenAddress
 * @returns
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
 * @param path
 * @param originalList
 * @param checkTokenList
 */
export const updateTokenListIfNeeded = (path: string, originalList: LineaTokenList, checkTokenList: Token[]): void => {
  if (_.isEqual(originalList.tokens, checkTokenList)) {
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
 * Check token errors
 * @param token
 * @param verifiedToken
 */
export const checkTokenErrors = (token: Token, verifiedToken: Token): void => {
  if (token.address !== verifiedToken.address) {
    logger.error('address mismatch', {
      name: token.name,
      currentTokenAddress: token.address,
      newTokenAddress: verifiedToken.address,
    });
    throw new Error('address mismatch');
  } else if (token.extension?.rootAddress !== verifiedToken.extension?.rootAddress) {
    logger.error('rootAddress mismatch', {
      name: token.name,
      currentTokenRootAddress: token.extension?.rootAddress,
      newTokenRootAddress: verifiedToken.extension?.rootAddress,
    });
    throw new Error('rootAddress mismatch');
  } else if (token.symbol !== verifiedToken.symbol) {
    logger.error('symbol mismatch', {
      name: token.name,
      currentTokenSymbol: token.symbol,
      newTokenSymbol: verifiedToken.symbol,
    });
    throw new Error('symbol mismatch');
  } else if (token.decimals !== verifiedToken.decimals) {
    logger.error('decimals mismatch', {
      name: token.name,
      currentTokenDecimals: token.decimals,
      newTokenDecimals: verifiedToken.decimals,
    });
    throw new Error('decimals mismatch');
  }
};
