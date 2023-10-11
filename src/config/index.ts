require('dotenv').config();

export const config = {
  PROVIDER_URL: process.env.PROVIDER_URL || '',
  LINEA_PROVIDER_URL: process.env.LINEA_PROVIDER_URL || '',
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || '',
  L2_CONTRACT_ADDRESS: process.env.L2_CONTRACT_ADDRESS || '',
  CONTRACT_ABI_PATH: 'src/abis/token-bridge.abi.json',
  ERC20_ABI_PATH: 'src/abis/ERC20.abi.json',
  ERC20_BYTE32_ABI_PATH: 'src/abis/ERC20-byte32.abi.json',
  TOKEN_LIST_PATH: 'json/linea-mainnet-token-fulllist.json',
  TOKEN_SHORT_LIST_PATH: 'json/linea-mainnet-token-shortlist.json',
  COINGECKO_URL: 'https://api.coingecko.com/api/v3/coins/1/contract/',
  ETHEREUM_MAINNET_CHAIN_ID: 1,
  LINEA_MAINNET_CHAIN_ID: 59144,
};
