import { config as dotenvConfig } from 'dotenv';
import { Config } from 'src/models/config';
import { validateConfig } from 'src/utils/validation';

dotenvConfig();

export const config: Config = {
  L1_PROVIDER_URL: process.env.PROVIDER_URL || '',
  L2_PROVIDER_URL: process.env.LINEA_PROVIDER_URL || '',
  L1_TOKEN_BRIDGE_ADDRESS: process.env.CONTRACT_ADDRESS || '0x051F1D88f0aF5763fB888eC4378b4D8B29ea3319',
  L2_TOKEN_BRIDGE_ADDRESS: process.env.L2_CONTRACT_ADDRESS || '0x353012dc4a9A6cF55c941bADC267f82004A8ceB9',
  TOKEN_BRIDGE_ABI_PATH: 'src/abis/token-bridge.abi.json',
  ERC20_ABI_PATH: 'src/abis/ERC20.abi.json',
  ERC20_BYTE32_ABI_PATH: 'src/abis/ERC20-byte32.abi.json',
  TOKEN_SHORT_LIST_PATH: 'json/linea-mainnet-token-shortlist.json',
  ETHEREUM_MAINNET_CHAIN_ID: 1,
  LINEA_MAINNET_CHAIN_ID: 59144,
};

validateConfig(config);
