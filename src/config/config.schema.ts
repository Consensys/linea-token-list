import Joi from 'joi';

export const configSchema = Joi.object({
  L1_PROVIDER_URL: Joi.string().required().min(1).message('L1_PROVIDER_URL cannot be empty.'),
  L2_PROVIDER_URL: Joi.string().required().min(1).message('L2_PROVIDER_URL cannot be empty.'),
  L1_TOKEN_BRIDGE_ADDRESS: Joi.string().required().min(1).message('L1_TOKEN_BRIDGE_ADDRESS cannot be empty.'),
  L2_TOKEN_BRIDGE_ADDRESS: Joi.string().required().min(1).message('L2_TOKEN_BRIDGE_ADDRESS cannot be empty.'),

  TOKEN_BRIDGE_ABI_PATH: Joi.string().default('src/abis/token-bridge.abi.json'),
  ERC20_ABI_PATH: Joi.string().default('src/abis/ERC20.abi.json'),
  ERC20_BYTE32_ABI_PATH: Joi.string().default('src/abis/ERC20-byte32.abi.json'),
  TOKEN_FULL_LIST_PATH: Joi.string().default('json/linea-mainnet-token-fulllist.json'),
  TOKEN_SHORT_LIST_PATH: Joi.string().default('json/linea-mainnet-token-shortlist.json'),

  COINGECKO_URL: Joi.string().default('https://api.coingecko.com/api/v3/coins/1/contract/'),
  COINMARKETCAP_URL: Joi.string().default('https://pro-api.coinmarketcap.com'),
  COINMARKETCAP_API_KEY: Joi.string().allow('').optional(),
  ETHEREUM_MAINNET_CHAIN_ID: Joi.number().default(1),
  LINEA_MAINNET_CHAIN_ID: Joi.number().default(59144),
});
