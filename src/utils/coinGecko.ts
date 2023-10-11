import axios, { AxiosResponse } from 'axios';
import { config } from 'src/config';
import { logger } from 'src/logger';
import { Token } from 'src/models/token';
import { utils } from 'ethers';

interface CoinGeckoResponse {
  image: {
    large: string;
  };
}

export const fetchLogoURI = async (tokenInfo: Token): Promise<string | null> => {
  const { COINGECKO_URL, ETHEREUM_MAINNET_CHAIN_ID } = config;
  const { chainId, address, extension } = tokenInfo;

  const tokenAddress = chainId === ETHEREUM_MAINNET_CHAIN_ID ? address : extension?.rootAddress;

  if (!tokenAddress) {
    logger.warn('No token address provided', { tokenInfo });
    return null;
  }

  const normalizedAddress = utils.getAddress(tokenAddress); // Assuming utils.getAddress is a function that normalizes/validates the address.

  try {
    const url = new URL(normalizedAddress.toLowerCase(), COINGECKO_URL);
    const response: AxiosResponse<CoinGeckoResponse> = await axios.get(url.toString());

    return response.data.image.large;
  } catch (error) {
    handleFetchingError(error, normalizedAddress, COINGECKO_URL);
    return null;
  }
};

/**
 * Handle errors during data fetching from CoinGecko.
 * @param error The thrown error during fetching.
 * @param tokenAddress The address of the token being fetched.
 * @param baseURL The base URL being used to fetch.
 */
const handleFetchingError = (error: any, tokenAddress: string, baseURL: string): void => {
  if (axios.isAxiosError(error)) {
    const { status, data } = error.response || {};
    if (status === 429) {
      const rateErrorMessage = 'CoinGecko rate limit reached';
      logger.warn(rateErrorMessage);
      throw new Error(rateErrorMessage);
    } else {
      logger.warn('Error fetching logoURI from CoinGecko', {
        tokenAddress,
        baseURL,
        errorMessage: error.message,
        responseData: data,
      });
    }
  } else if (error instanceof TypeError) {
    logger.error('Error constructing CoinGecko URL', { tokenAddress, baseURL });
  } else {
    logger.error('An unexpected error occurred while fetching CoinGecko data', { tokenAddress, error });
  }
};
