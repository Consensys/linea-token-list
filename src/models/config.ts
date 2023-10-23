/* istanbul ignore file */

export type Config = {
  L1_PROVIDER_URL: string;
  L2_PROVIDER_URL: string;
  L1_TOKEN_BRIDGE_ADDRESS: string;
  L2_TOKEN_BRIDGE_ADDRESS: string;
  TOKEN_BRIDGE_ABI_PATH: string;
  ERC20_ABI_PATH: string;
  ERC20_BYTE32_ABI_PATH: string;
  TOKEN_FULL_LIST_PATH: string;
  TOKEN_SHORT_LIST_PATH: string;
  COINGECKO_URL: string;
  COINMARKETCAP_URL: string;
  COINMARKETCAP_API_KEY: string;
  ETHEREUM_MAINNET_CHAIN_ID: number;
  LINEA_MAINNET_CHAIN_ID: number;
};
