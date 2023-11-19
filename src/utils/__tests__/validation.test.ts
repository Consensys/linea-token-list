import { configSchema } from 'src/config/config.schema';
import { logger } from 'src/logger';
import { Config } from 'src/models/config';
import { validateConfig } from '../validation';

jest.mock('src/config/config.schema');
jest.mock('src/logger');

describe('validateConfig', () => {
  const mockConfig: Config = {
    L1_PROVIDER_URL: 'http://localhost:8545',
    L2_PROVIDER_URL: 'http://localhost:8546',
    L1_TOKEN_BRIDGE_ADDRESS: '0x123',
    L2_TOKEN_BRIDGE_ADDRESS: '0x456',
    TOKEN_BRIDGE_ABI_PATH: 'path1',
    ERC20_ABI_PATH: 'path2',
    ERC20_BYTE32_ABI_PATH: 'path3',
    TOKEN_FULL_LIST_PATH: 'path4',
    TOKEN_SHORT_LIST_PATH: 'path5',
    COINGECKO_URL: 'http://coingecko.com',
    COINMARKETCAP_URL: 'http://coinmarketcap.com',
    COINMARKETCAP_API_KEY: 'key',
    ETHEREUM_MAINNET_CHAIN_ID: 1,
    LINEA_MAINNET_CHAIN_ID: 59144,
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should validate config successfully', () => {
    (configSchema.validate as jest.Mock).mockReturnValue({ error: null });
    const infoSpy = jest.spyOn(logger, 'info');

    validateConfig(mockConfig);

    expect(infoSpy).toHaveBeenCalledWith('Config validation success');
  });

  it('should throw error if config validation fails', () => {
    const errorMsg = 'Invalid L1_PROVIDER_URL';
    (configSchema.validate as jest.Mock).mockReturnValue({
      error: { message: errorMsg },
    });

    expect(() => validateConfig(mockConfig)).toThrow(`Config validation error: ${errorMsg}`);
  });
});
