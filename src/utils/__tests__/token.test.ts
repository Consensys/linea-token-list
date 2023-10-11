import { config } from 'src/config';
import { Token } from 'src/models/token';

import { Contract, utils, Event } from 'ethers';
import { checkTokenExists, fetchTokenInfo, getEventTokenAddresses } from '../token';

jest.mock('ethers');
jest.mock('src/config');

// Update interfaces as per your actual model definition
interface EventArg {
  token: string;
  bridgedToken: string;
  nativeToken: string;
}

type MyEvent = Event & {
  args: EventArg;
};

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

      const result = await fetchTokenInfo(mockContract, undefined);

      expect(result.name).toBe('MockToken');
      expect(result.symbol).toBe('MTK');
      expect(result.decimals).toBe(18);
      expect(result.address).toBe('');
      expect(result.extension?.rootAddress).toBe(utils.getAddress(mockContract.address));
    });
  });

  describe('checkTokenExists', () => {
    it('should find and return the token if it exists in the token list by address', () => {
      const mockToken: Token = {
        // ...token properties
        chainId: config.LINEA_MAINNET_CHAIN_ID,
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
});
