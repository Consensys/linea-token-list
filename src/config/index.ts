import { Config } from 'src/models/config';

require('dotenv').config();

export const config: Config = {
  L1_PROVIDER_URL: process.env.PROVIDER_URL || '',
  L2_PROVIDER_URL: process.env.LINEA_PROVIDER_URL || '',
  L1_TOKEN_BRIDGE_ADDRESS: process.env.CONTRACT_ADDRESS || '',
  L2_TOKEN_BRIDGE_ADDRESS: process.env.L2_CONTRACT_ADDRESS || '',
  TOKEN_BRIDGE_ABI_PATH: 'src/abis/token-bridge.abi.json',
  ERC20_ABI_PATH: 'src/abis/ERC20.abi.json',
  ERC20_BYTE32_ABI_PATH: 'src/abis/ERC20-byte32.abi.json',
  TOKEN_FULL_LIST_PATH: 'json/linea-mainnet-token-fulllist.json',
  TOKEN_SHORT_LIST_PATH: 'json/linea-mainnet-token-shortlist.json',
  COINGECKO_URL: 'https://api.coingecko.com/api/v3/coins/1/contract/',
  COINMARKETCAP_URL: 'https://pro-api.coinmarketcap.com',
  COINMARKETCAP_API_KEY: process.env.COINMARKETCAP_API_KEY || '',
  ETHEREUM_MAINNET_CHAIN_ID: 1,
  LINEA_MAINNET_CHAIN_ID: 59144,
};
