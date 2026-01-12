import { formatLineaTokenList, formatToken } from '../file';
import { LineaTokenList, Token } from 'src/models/token';

describe('File Utility Functions', () => {
  describe('formatToken', () => {
    it('should format a token with all fields including extension', () => {
      const token: Token = {
        chainId: 59144,
        chainURI: 'https://lineascan.build/block/0',
        tokenId: 'https://lineascan.build/address/0x1234',
        tokenType: ['canonical-bridge'],
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        logoURI: 'https://example.com/logo.png',
        extension: {
          rootChainId: 1,
          rootChainURI: 'https://etherscan.io/block/0',
          rootAddress: '0x0987654321098765432109876543210987654321',
        },
      };

      const result = formatToken(token);

      expect(result).toEqual(token);
      expect(result.extension).toBeDefined();
      expect(result.extension?.rootChainId).toBe(1);
    });

    it('should format a token without extension', () => {
      const token: Token = {
        chainId: 59144,
        chainURI: 'https://lineascan.build/block/0',
        tokenId: 'https://lineascan.build/address/0x1234',
        tokenType: ['native'],
        address: '0x1234567890123456789012345678901234567890',
        name: 'Native Token',
        symbol: 'NATIVE',
        decimals: 18,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      const result = formatToken(token);

      expect(result.extension).toBeUndefined();
      expect(result.name).toBe('Native Token');
    });

    it('should preserve token field order', () => {
      const token: Token = {
        name: 'Test Token', // Wrong order in input
        chainId: 59144,
        symbol: 'TEST',
        chainURI: 'https://lineascan.build/block/0',
        tokenId: 'https://lineascan.build/address/0x1234',
        tokenType: ['canonical-bridge'],
        address: '0x1234567890123456789012345678901234567890',
        decimals: 18,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      const result = formatToken(token);
      const keys = Object.keys(result);

      // Verify the order of keys matches expected format
      expect(keys[0]).toBe('chainId');
      expect(keys[1]).toBe('chainURI');
      expect(keys[2]).toBe('tokenId');
      expect(keys[3]).toBe('tokenType');
      expect(keys[4]).toBe('address');
      expect(keys[5]).toBe('name');
      expect(keys[6]).toBe('symbol');
    });
  });

  describe('formatLineaTokenList', () => {
    it('should format a token list with sorted tokens', () => {
      const list: LineaTokenList = {
        type: 'LineaTokenList',
        tokenListId: 'https://example.com/tokens.json',
        name: 'Test Token List',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        versions: [{ major: 1, minor: 0, patch: 0 }],
        tokens: [
          {
            chainId: 59144,
            chainURI: 'https://lineascan.build/block/0',
            tokenId: 'https://lineascan.build/address/0x1234',
            tokenType: ['native'],
            address: '0x1234',
            name: 'Zebra Token', // Should be sorted last
            symbol: 'ZEB',
            decimals: 18,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          {
            chainId: 59144,
            chainURI: 'https://lineascan.build/block/0',
            tokenId: 'https://lineascan.build/address/0x5678',
            tokenType: ['native'],
            address: '0x5678',
            name: 'Alpha Token', // Should be sorted first
            symbol: 'ALPHA',
            decimals: 18,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      };

      const result = formatLineaTokenList(list);

      // Tokens should be sorted by name
      expect(result.tokens[0].name).toBe('Alpha Token');
      expect(result.tokens[1].name).toBe('Zebra Token');
    });

    it('should preserve list metadata', () => {
      const list: LineaTokenList = {
        type: 'LineaTokenList',
        tokenListId: 'https://example.com/tokens.json',
        name: 'Test Token List',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        versions: [{ major: 2, minor: 5, patch: 3 }],
        tokens: [],
      };

      const result = formatLineaTokenList(list);

      expect(result.type).toBe('LineaTokenList');
      expect(result.tokenListId).toBe('https://example.com/tokens.json');
      expect(result.name).toBe('Test Token List');
      expect(result.createdAt).toBe('2024-01-01');
      expect(result.updatedAt).toBe('2024-01-02');
      expect(result.versions).toEqual([{ major: 2, minor: 5, patch: 3 }]);
    });

    it('should handle empty token list', () => {
      const list: LineaTokenList = {
        type: 'LineaTokenList',
        tokenListId: 'https://example.com/tokens.json',
        name: 'Empty List',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        versions: [{ major: 1, minor: 0, patch: 0 }],
        tokens: [],
      };

      const result = formatLineaTokenList(list);

      expect(result.tokens).toEqual([]);
    });
  });
});
