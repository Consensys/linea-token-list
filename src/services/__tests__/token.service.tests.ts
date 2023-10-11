import { Contract, utils, providers } from 'ethers';

import { config } from 'src/config';
import { loadABI } from 'src/utils/abi';
import { logger } from 'src/logger';
import { TokenService } from 'src/services/token.service';

jest.mock('ethers', () => ({
  Contract: jest.fn(),
  utils: {
    getAddress: jest.fn((address) => address),
  },
  providers: {
    JsonRpcProvider: jest.fn(),
  },
}));

const mockABI = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [
      {
        name: '',
        type: 'string',
      },
    ],
    payable: false,
    type: 'function',
  },
];

jest.mock('src/utils/abi', () => ({
  loadABI: jest.fn(() => mockABI),
}));

const mockedLoadABI = loadABI as jest.MockedFunction<typeof loadABI>;

describe('TokenService', () => {
  let tokenService;
  const mockL1Provider = new providers.JsonRpcProvider();
  const mockLineaProvider = new providers.JsonRpcProvider();
  const mockExistingTokenList = {
    type: 'linea',
    tokenListId: '1',
    name: 'LineaTokenList',
    createdAt: '2023-10-11T00:00:00Z',
    updatedAt: '2023-10-11T00:00:00Z',
    versions: [],
    tokens: [],
  };

  beforeEach(() => {
    // Mock implementations...
    mockedLoadABI.mockImplementation(() => 'mockABI');
    // Initialize service...
    tokenService = new TokenService(mockL1Provider, mockLineaProvider, mockExistingTokenList);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should instantiate contracts with provided ABIs and addresses', () => {
    expect(loadABI).toHaveBeenCalledWith(config.TOKEN_BRIDGE_ABI_PATH);
    expect(loadABI).toHaveBeenCalledWith(config.ERC20_ABI_PATH);
    expect(loadABI).toHaveBeenCalledWith(config.ERC20_BYTE32_ABI_PATH);
    expect(Contract).toHaveBeenCalledWith(config.CONTRACT_ADDRESS, 'mockABI', mockL1Provider);
    expect(Contract).toHaveBeenCalledWith(config.L2_CONTRACT_ADDRESS, 'mockABI', mockLineaProvider);
  });
});
