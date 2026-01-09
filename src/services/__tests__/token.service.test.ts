import { createPublicClient, http, type PublicClient } from 'viem';
import { mainnet, linea } from 'viem/chains';

import { TokenService } from '../token.service';
import { mockExistingTokenList, mockTokenShortlist } from './mockedData';
import { Token, TokenType } from 'src/models/token';
import { config } from 'src/config';

describe('TokenService', () => {
  let tokenService: TokenService;
  let l1Client: PublicClient;
  let l2Client: PublicClient;

  beforeEach(() => {
    // Create mock clients - these won't actually connect in tests
    l1Client = createPublicClient({
      chain: mainnet,
      transport: http('https://mock-l1-provider'),
    });
    l2Client = createPublicClient({
      chain: linea,
      transport: http('https://mock-l2-provider'),
    });

    tokenService = new TokenService(l1Client, l2Client);
  });

  describe('fetchAndAssignTokenLogo', () => {
    it('should fetch and assign the token logo URI', async () => {
      const token: Token = mockExistingTokenList[0];
      const mockLogoURI = 'https://s2.coinmarketcap.com/static/img/coins/64x64/15024.png';

      const fetchLogoURIMock = jest.spyOn(tokenService, 'fetchAndAssignTokenLogo');
      fetchLogoURIMock.mockResolvedValue(mockExistingTokenList[0]);

      const result = await tokenService.fetchAndAssignTokenLogo(token);

      expect(result?.logoURI).toEqual(mockLogoURI);
    });
  });

  describe('updateTokenInfo', () => {
    it('should update token info for Linea mainnet chain', () => {
      const baseToken: Token = {
        chainId: 0,
        chainURI: '',
        tokenId: '',
        tokenType: [],
        address: '',
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        extension: {
          rootChainId: 0,
          rootChainURI: '',
          rootAddress: '',
        },
      };

      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const nativeTokenAddress = '0x0987654321098765432109876543210987654321';

      const result = tokenService.updateTokenInfo(
        baseToken,
        config.LINEA_MAINNET_CHAIN_ID,
        tokenAddress,
        nativeTokenAddress,
        [TokenType.CANONICAL_BRIDGE]
      );

      expect(result.chainId).toBe(config.LINEA_MAINNET_CHAIN_ID);
      expect(result.chainURI).toBe('https://lineascan.build/block/0');
      expect(result.tokenId).toBe(`https://lineascan.build/address/${tokenAddress}`);
      expect(result.address).toBe(tokenAddress);
      expect(result.tokenType).toEqual([TokenType.CANONICAL_BRIDGE]);
      expect(result.extension?.rootChainId).toBe(config.ETHEREUM_MAINNET_CHAIN_ID);
      expect(result.extension?.rootChainURI).toBe('https://etherscan.io/block/0');
      expect(result.extension?.rootAddress).toBe(nativeTokenAddress);
    });

    it('should update token info for Ethereum mainnet chain', () => {
      const baseToken: Token = {
        chainId: 0,
        chainURI: '',
        tokenId: '',
        tokenType: [],
        address: '',
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        extension: {
          rootChainId: 0,
          rootChainURI: '',
          rootAddress: '',
        },
      };

      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const nativeTokenAddress = '0x0987654321098765432109876543210987654321';

      const result = tokenService.updateTokenInfo(
        baseToken,
        config.ETHEREUM_MAINNET_CHAIN_ID,
        tokenAddress,
        nativeTokenAddress,
        [TokenType.NATIVE]
      );

      expect(result.chainId).toBe(config.ETHEREUM_MAINNET_CHAIN_ID);
      expect(result.chainURI).toBe('https://etherscan.io/block/0');
      expect(result.tokenId).toBe(`https://etherscan.io/address/${tokenAddress}`);
      expect(result.address).toBe(tokenAddress);
      expect(result.tokenType).toEqual([TokenType.NATIVE]);
      expect(result.extension?.rootChainId).toBe(config.LINEA_MAINNET_CHAIN_ID);
      expect(result.extension?.rootChainURI).toBe('https://lineascan.build/block/0');
      expect(result.extension?.rootAddress).toBe(nativeTokenAddress);
    });

    it('should handle token without native address', () => {
      const baseToken: Token = {
        chainId: 0,
        chainURI: '',
        tokenId: '',
        tokenType: [],
        address: '',
        name: 'Native Token',
        symbol: 'NATIVE',
        decimals: 18,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      const tokenAddress = '0x1234567890123456789012345678901234567890';

      const result = tokenService.updateTokenInfo(baseToken, config.LINEA_MAINNET_CHAIN_ID, tokenAddress, undefined, [
        TokenType.NATIVE,
      ]);

      expect(result.chainId).toBe(config.LINEA_MAINNET_CHAIN_ID);
      expect(result.address).toBe(tokenAddress);
      expect(result.tokenType).toEqual([TokenType.NATIVE]);
      expect(result.extension).toBeUndefined();
    });

    it('should handle multiple token types', () => {
      const baseToken: Token = {
        chainId: 0,
        chainURI: '',
        tokenId: '',
        tokenType: [],
        address: '',
        name: 'Bridge Reserved Token',
        symbol: 'BRT',
        decimals: 6,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        extension: {
          rootChainId: 0,
          rootChainURI: '',
          rootAddress: '',
        },
      };

      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const nativeTokenAddress = '0x0987654321098765432109876543210987654321';

      const result = tokenService.updateTokenInfo(
        baseToken,
        config.LINEA_MAINNET_CHAIN_ID,
        tokenAddress,
        nativeTokenAddress,
        [TokenType.BRIDGE_RESERVED, TokenType.EXTERNAL_BRIDGE]
      );

      expect(result.tokenType).toEqual([TokenType.BRIDGE_RESERVED, TokenType.EXTERNAL_BRIDGE]);
    });
  });

  describe('concatTokenShortList', () => {
    it('should add new tokens to the token list', () => {
      tokenService['tokenList'] = [...mockExistingTokenList];

      tokenService.concatTokenShortList(mockTokenShortlist);

      expect(tokenService['tokenList']).toHaveLength(3);
      expect(tokenService['tokenList']).toEqual(
        expect.arrayContaining([
          ...mockExistingTokenList, // Existing token should still be in the list
          mockTokenShortlist.tokens[0], // New token should be added to the list
        ])
      );
    });

    it('should replace existing tokens in the token list if they are different', () => {
      tokenService['tokenList'] = mockExistingTokenList;

      tokenService.concatTokenShortList(mockTokenShortlist);

      expect(tokenService['tokenList']).toHaveLength(3);
      expect(tokenService['tokenList']).toEqual(expect.arrayContaining([mockTokenShortlist.tokens[0]]));
    });

    it('should not modify the token list if existing tokens are the same', () => {
      tokenService['tokenList'] = [...mockExistingTokenList];

      tokenService.concatTokenShortList(mockTokenShortlist);

      expect(tokenService['tokenList']).toHaveLength(3);
      expect(tokenService['tokenList']).toEqual(expect.arrayContaining([...mockExistingTokenList]));
    });

    it('should handle empty token list', () => {
      tokenService['tokenList'] = [];

      tokenService.concatTokenShortList(mockTokenShortlist);

      expect(tokenService['tokenList']).toHaveLength(2);
      expect(tokenService['tokenList']).toEqual(mockTokenShortlist.tokens);
    });

    it('should update token if address matches but content differs', () => {
      const modifiedToken = {
        ...mockExistingTokenList[0],
        logoURI: 'https://new-logo-url.com/logo.png',
      };
      tokenService['tokenList'] = [modifiedToken];

      const shortlistWithSameAddress: typeof mockTokenShortlist = {
        ...mockTokenShortlist,
        tokens: [
          {
            ...mockExistingTokenList[0],
            logoURI: 'https://updated-logo-url.com/logo.png',
          },
        ],
      };

      tokenService.concatTokenShortList(shortlistWithSameAddress);

      expect(tokenService['tokenList']).toHaveLength(1);
      expect(tokenService['tokenList'][0].logoURI).toBe('https://updated-logo-url.com/logo.png');
    });
  });

  describe('verifyToken', () => {
    it('should throw error for Ethereum mainnet chain ID', async () => {
      const token: Token = {
        ...mockExistingTokenList[0],
        chainId: config.ETHEREUM_MAINNET_CHAIN_ID,
      };

      await expect(tokenService.verifyToken(token)).rejects.toThrow('ChainId not supported yet');
    });

    it('should throw error for invalid chain ID', async () => {
      const token: Token = {
        ...mockExistingTokenList[0],
        chainId: 999999,
      };

      await expect(tokenService.verifyToken(token)).rejects.toThrow('Invalid chainId');
    });
  });
});
