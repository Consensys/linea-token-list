import { Contract, Event, utils } from 'ethers';

import { getCurrentDate } from 'src/utils/date';
import { ABIType, Token } from 'src/models/token';
import { config } from 'src/config';
import { logger } from 'src/logger';

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
