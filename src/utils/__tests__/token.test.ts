import { type PublicClient, type Address } from 'viem';
import { ABIType, Token } from 'src/models/token';
import { logger } from 'src/logger';

import { getCurrentDate } from '../date';
import { checkTokenErrors, checkTokenExists, fetchTokenInfo } from '../token';

// Mock viem's readContract
jest.mock('viem', () => {
  const actual = jest.requireActual('viem');
  return {
    ...actual,
    createPublicClient: jest.fn(() => ({
      readContract: jest.fn(),
    })),
  };
});

describe('Token Utility Functions', () => {
  describe('fetchTokenInfo', () => {
    it('should fetch token info and return a Token object', async () => {
      const mockClient = {
        readContract: jest
          .fn()
          .mockResolvedValueOnce('MockToken') // name
          .mockResolvedValueOnce('MTK') // symbol
          .mockResolvedValueOnce(18n), // decimals
      } as unknown as PublicClient;

      const mockAddress: Address = '0x3155BA85D5F96b2d030a4966AF206230e46849cb';
      const mockAbi = [
        { name: 'name', type: 'function', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
        { name: 'symbol', type: 'function', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
        { name: 'decimals', type: 'function', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
      ] as const;

      const result = await fetchTokenInfo(mockClient, mockAddress, mockAbi, ABIType.STANDARD);

      const expectedToken: Token = {
        chainId: 0,
        chainURI: '',
        tokenId: '',
        tokenType: [],
        address: '',
        name: 'MockToken',
        symbol: 'MTK',
        decimals: 18,
        createdAt: getCurrentDate(),
        updatedAt: getCurrentDate(),
        extension: {
          rootChainId: 1,
          rootChainURI: '',
          rootAddress: '0x3155BA85D5F96b2d030a4966AF206230e46849cb',
        },
      };

      expect(result).toEqual(expectedToken);
    });

    it('should parse bytes32 values for BYTE32 ABI type', async () => {
      // bytes32 representation of "MakerDAO" (padded)
      const nameBytes32 = '0x4d616b657244414f0000000000000000000000000000000000000000000000';
      // bytes32 representation of "MKR" (padded)
      const symbolBytes32 = '0x4d4b520000000000000000000000000000000000000000000000000000000000';

      const mockClient = {
        readContract: jest
          .fn()
          .mockResolvedValueOnce(nameBytes32)
          .mockResolvedValueOnce(symbolBytes32)
          .mockResolvedValueOnce(18n),
      } as unknown as PublicClient;

      const mockAddress: Address = '0x3155BA85D5F96b2d030a4966AF206230e46849cb';
      const mockAbi = [
        { name: 'name', type: 'function', inputs: [], outputs: [{ type: 'bytes32' }], stateMutability: 'view' },
        { name: 'symbol', type: 'function', inputs: [], outputs: [{ type: 'bytes32' }], stateMutability: 'view' },
        { name: 'decimals', type: 'function', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
      ] as const;

      const result = await fetchTokenInfo(mockClient, mockAddress, mockAbi, ABIType.BYTE32);

      expect(result.name).toBe('MakerDAO');
      expect(result.symbol).toBe('MKR');
    });
  });

  describe('checkTokenExists', () => {
    it('should find and return the token if it exists in the token list by address', () => {
      const mockToken: Token = {
        chainId: 1,
        chainURI: 'https://lineascan.build/block/0',
        tokenId: 'https://lineascan.build/address/',
        tokenType: ['canonical-bridge'],
        address: '0x3155BA85D5F96b2d030a4966AF206230e46849cb',
        name: 'MockToken',
        symbol: 'MTK',
        decimals: 18,
        createdAt: '2023-10-13T00:00:00Z',
        updatedAt: '2023-10-13T00:00:00Z',
        extension: {
          rootChainId: 1,
          rootChainURI: 'https://etherscan.io',
          rootAddress: '0x8E870D67F660D95d5be530380D0eC0bd388289E1',
        },
      };

      const tokenList: Token[] = [mockToken];
      const tokenAddress = '0x3155BA85D5F96b2d030a4966AF206230e46849cb';

      const result = checkTokenExists(tokenList, tokenAddress);

      expect(result).toEqual(mockToken);
    });

    it('should find token by extension rootAddress', () => {
      const mockToken: Token = {
        chainId: 1,
        chainURI: 'https://lineascan.build/block/0',
        tokenId: 'https://lineascan.build/address/',
        tokenType: ['canonical-bridge'],
        address: '0x3155BA85D5F96b2d030a4966AF206230e46849cb',
        name: 'MockToken',
        symbol: 'MTK',
        decimals: 18,
        createdAt: '2023-10-13T00:00:00Z',
        updatedAt: '2023-10-13T00:00:00Z',
        extension: {
          rootChainId: 1,
          rootChainURI: 'https://etherscan.io',
          rootAddress: '0x8E870D67F660D95d5be530380D0eC0bd388289E1',
        },
      };

      const tokenList: Token[] = [mockToken];
      const rootAddress = '0x8E870D67F660D95d5be530380D0eC0bd388289E1';

      const result = checkTokenExists(tokenList, rootAddress);

      expect(result).toEqual(mockToken);
    });

    it('should return undefined if token is not found', () => {
      const tokenList: Token[] = [];
      const tokenAddress = '0x3155BA85D5F96b2d030a4966AF206230e46849cb';

      const result = checkTokenExists(tokenList, tokenAddress);

      expect(result).toBeUndefined();
    });
  });

  describe('checkTokenErrors', () => {
    it('should throw an error for mismatched token fields', () => {
      const token: Token = {
        chainId: 1,
        chainURI: '',
        tokenId: '',
        tokenType: [],
        address: '0xTokenAddress1',
        name: 'TokenName1',
        symbol: 'SYMBOL1',
        decimals: 18,
        createdAt: '2023-10-13T00:00:00Z',
        updatedAt: '2023-10-13T00:00:00Z',
        extension: {
          rootChainId: 1,
          rootChainURI: '',
          rootAddress: '0xRootAddress1',
        },
      };
      const verifiedToken: Token = {
        chainId: 2, // Mismatched field
        chainURI: '',
        tokenId: '',
        tokenType: [],
        address: '0xTokenAddress1',
        name: 'TokenName1',
        symbol: 'SYMBOL1',
        decimals: 18,
        createdAt: '2023-10-13T00:00:00Z',
        updatedAt: '2023-10-13T00:00:00Z',
        extension: {
          rootChainId: 1,
          rootChainURI: '',
          rootAddress: '0xRootAddress1',
        },
      };

      const mockLoggerError = jest.spyOn(logger, 'error');

      expect(() => checkTokenErrors(token, verifiedToken)).toThrowError();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'chainId mismatch',
        expect.objectContaining({ currentChainId: 1, newChainId: 2 })
      );
    });

    it('should not throw for matching tokens', () => {
      const token: Token = {
        chainId: 1,
        chainURI: '',
        tokenId: '',
        tokenType: [],
        address: '0xTokenAddress1',
        name: 'TokenName1',
        symbol: 'SYMBOL1',
        decimals: 18,
        createdAt: '2023-10-13T00:00:00Z',
        updatedAt: '2023-10-13T00:00:00Z',
        extension: {
          rootChainId: 1,
          rootChainURI: '',
          rootAddress: '0xRootAddress1',
        },
      };

      expect(() => checkTokenErrors(token, token)).not.toThrow();
    });
  });
});
