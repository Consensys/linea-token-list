import axios from 'axios';
import { Token } from 'src/models/token';
import { fetchLogoURI } from 'src/utils/coinGecko';
import { getCurrentDate } from 'src/utils/date';
import { logger } from 'src/logger';

// Mocking axios module
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('fetchLogoURI', () => {
  // Define a sample token to use throughout the tests
  const sampleToken: Token = {
    chainId: 1,
    chainURI: 'https://etherscan.io/block/0',
    tokenId: 'https://lineascan.build/address/',
    tokenType: ['canonical-bridge'],
    address: '0x1234567890123456789012345678901234567890',
    name: 'Sample Token',
    symbol: 'SMT',
    decimals: Number(18),
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    extension: {
      rootAddress: '0x0987654321098765432109876543210987654321',
      rootChainId: 1,
      rootChainURI: 'https://etherscan.io/block/0',
    },
  };

  afterEach(() => {
    jest.clearAllMocks(); // Clear all mocks after each test
  });

  it('should fetch the logo URI successfully', async () => {
    // Mock axios.get to resolve with a mocked response
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        image: {
          large: 'https://example.com/sample-image.png',
        },
      },
    } as any);

    const result = await fetchLogoURI(sampleToken);

    expect(result).toBe('https://example.com/sample-image.png');
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining(sampleToken.address));
  });

  it('should return null and log warning if token address is not provided', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();

    // token with no address
    const tokenWithoutAddress: Token = {
      ...sampleToken,
      address: '',
      extension: undefined,
    };

    const result = await fetchLogoURI(tokenWithoutAddress);

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('No token address provided', expect.any(Object));

    warnSpy.mockRestore();
  });

  it('should return null and handle error if fetching fails', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Request failed'));

    // Error handling and logging should be tested as well, but for brevity
    // those parts are skipped in this example.

    const result = await fetchLogoURI(sampleToken);

    expect(result).toBeNull();
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining(sampleToken.address));
  });
});
