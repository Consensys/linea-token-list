import fs from 'fs';
import { logger } from 'src/logger';
import { LineaTokenList, Token } from 'src/models/token';

/**
 * Reads a JSON file
 * @param filePath
 * @returns
 */
export const readJsonFile = (filePath: string): any => {
  try {
    return JSON.parse(fs.readFileSync(filePath).toString());
  } catch (error) {
    logger.error(`Error reading file: ${error}`);
    throw error;
  }
};

/**
 * Saves a JSON file
 * @param filePath
 * @param data
 */
export const saveJsonFile = (filePath: string, data: any): void => {
  try {
    const formattedData = formatLineaTokenList(data);
    fs.writeFileSync(filePath, JSON.stringify(formattedData, null, 2));
  } catch (error) {
    logger.error(`Error writing file: ${error}`);
    throw error;
  }
};

/**
 * Orders the properties of a LineaTokenList object, including nested Token objects
 * @param list
 * @returns
 */
export const formatLineaTokenList = (list: LineaTokenList): LineaTokenList => {
  return {
    type: list.type,
    tokenListId: list.tokenListId,
    name: list.name,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    versions: list.versions,
    tokens: list.tokens.map(formatToken),
  };
};

export const formatToken = (token: Token): Token => {
  return {
    chainId: token.chainId,
    chainURI: token.chainURI,
    tokenId: token.tokenId,
    tokenType: token.tokenType,
    address: token.address,
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    createdAt: token.createdAt,
    updatedAt: token.updatedAt,
    logoURI: token.logoURI,
    extension: token.extension && {
      rootChainId: token.extension.rootChainId,
      rootChainURI: token.extension.rootChainURI,
      rootAddress: token.extension.rootAddress,
    },
  };
};
