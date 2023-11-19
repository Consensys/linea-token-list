import axios, { AxiosResponse } from 'axios';
import { config } from 'src/config';
import { logger } from 'src/logger';
import { Token } from 'src/models/token';
import { utils } from 'ethers';

interface CoinMarketCapResponse {
  logo: string;
}

interface CoinGeckoResponse {
  image: {
    large: string;
  };
}

export enum CryptoService {
  COINGECKO = 'CoinGecko',
  COINMARKETCAP = 'CoinMarketCap',
}

export const fetchLogoURI = async (token: Token, service: CryptoService): Promise<string | null> => {
  switch (service) {
    case CryptoService.COINGECKO:
      return fetchCoinGeckoLogoURI(token);
    case CryptoService.COINMARKETCAP:
      return fetchCoinMarketCapLogoURI(token);
    default:
      logger.error('Unsupported service', { service });
      return null;
  }
};

/**
 * Fetch the logo URI from CoinMarketCap.
 * @param tokenInfo
 * @returns
 */
export const fetchCoinMarketCapLogoURI = async (tokenInfo: Token): Promise<string | null> => {
  const { COINMARKETCAP_URL, ETHEREUM_MAINNET_CHAIN_ID } = config;
  const { chainId, address, extension } = tokenInfo;

  const tokenAddress = chainId === ETHEREUM_MAINNET_CHAIN_ID ? address : extension?.rootAddress;

  if (!tokenAddress) {
    logger.warn('No token address provided', { tokenInfo });
    return null;
  }

  const normalizedAddress = utils.getAddress(tokenAddress); // Assuming utils.getAddress is a function that normalizes/validates the address.

  try {
    const url = new URL('/v2/cryptocurrency/info', COINMARKETCAP_URL);
    const response: AxiosResponse<CoinMarketCapResponse> = await axios.get(url.toString(), {
      params: {
        address: tokenAddress,
      },
      headers: {
        'X-CMC_PRO_API_KEY': config.COINMARKETCAP_API_KEY,
      },
      timeout: 5000,
    });
    return response.data.logo;
  } catch (error) {
    handleFetchingError(error, normalizedAddress, COINMARKETCAP_URL);
    return null;
  }
};

/**
 * Fetch the logo URI from CoinGecko.
 * @param token
 * @returns
 */
export const fetchCoinGeckoLogoURI = async (token: Token): Promise<string | null> => {
  const { COINGECKO_URL, ETHEREUM_MAINNET_CHAIN_ID } = config;
  const { chainId, address, extension } = token;

  const tokenAddress = chainId === ETHEREUM_MAINNET_CHAIN_ID ? address : extension?.rootAddress;

  if (!tokenAddress) {
    logger.warn('No token address provided', { token });
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
 * Handle errors during data fetching.
 * @param error The thrown error during fetching.
 * @param tokenAddress The address of the token being fetched.
 * @param baseURL The base URL being used to fetch.
 */
const handleFetchingError = (error: any, tokenAddress: string, baseURL: string): void => {
  if (axios.isAxiosError(error)) {
    const { status, data } = error.response || {};
    if (status === 429) {
      const rateErrorMessage = 'Rate limit reached';
      logger.warn(rateErrorMessage);
      throw new Error(rateErrorMessage);
    } else {
      logger.warn('Error fetching logoURI', {
        tokenAddress,
        baseURL,
        errorMessage: error.message,
        responseData: data,
      });
    }
  } else if (error instanceof TypeError) {
    logger.error('Error constructing URL', { tokenAddress, baseURL });
  } else {
    logger.error('An unexpected error occurred while fetching data', { tokenAddress, error });
  }
};
