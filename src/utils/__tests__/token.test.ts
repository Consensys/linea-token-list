import { ABIType, Token } from 'src/models/token';
import { Contract, utils } from 'ethers';
import { logger } from 'src/logger';

import { getCurrentDate } from '../date';
import { checkTokenErrors, checkTokenExists, fetchTokenInfo, getEventTokenAddresses } from '../token';

jest.mock('ethers');
jest.mock('src/config');

describe('Token Utility Functions', () => {
  describe('getEventTokenAddresses', () => {
    it('should return normalized token addresses from event', () => {
      const mockEvent: any = {
        args: {
          token: '0x3155BA85D5F96b2d030a4966AF206230e46849cb',
          bridgedToken: '0x8E870D67F660D95d5be530380D0eC0bd388289E1',
          nativeToken: '0xd38BB40815d2B0c2d2c866e0c72c5728ffC76dd9',
        },
        event: 'NewTokenDeployed',
      };

      const { tokenAddress, nativeTokenAddress } = getEventTokenAddresses(mockEvent);

      expect(tokenAddress).toBe(utils.getAddress(mockEvent.args.bridgedToken));
      expect(nativeTokenAddress).toBe(utils.getAddress(mockEvent.args.nativeToken));
    });
  });

  describe('fetchTokenInfo', () => {
    it('should fetch token info and return a Token object', async () => {
      const mockContract = {
        name: jest.fn().mockResolvedValue('MockToken'),
        symbol: jest.fn().mockResolvedValue('MTK'),
        decimals: jest.fn().mockResolvedValue(18),
        address: '0xmockAddress...',
      } as unknown as Contract;

      const result = await fetchTokenInfo(mockContract, ABIType.STANDARD);

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
          rootAddress: utils.getAddress(mockContract.address),
        },
      };

      expect(result).toEqual(expectedToken);
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
  });
});
