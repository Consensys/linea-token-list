import { Token, Version } from 'src/models/token';
import { getCurrentDate } from 'src/utils/date';
import { getBumpedVersions, sortAlphabetically } from 'src/utils/list';

const sampleTokenList: Token[] = [
  {
    chainId: 1,
    chainURI: 'https://etherscan.io/block/0',
    tokenId: 'https://lineascan.build/address/',
    tokenType: ['canonical-bridge'],
    address: '0x1234567890123456789012345678901234567890',
    name: 'Token C',
    symbol: 'TC',
    decimals: Number(18),
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    extension: {
      rootAddress: '0x0987654321098765432109876543210987654321',
      rootChainId: 1,
      rootChainURI: 'https://etherscan.io/block/0',
    },
  },
  {
    chainId: 1,
    chainURI: 'https://etherscan.io/block/0',
    tokenId: 'https://lineascan.build/address/',
    tokenType: ['canonical-bridge'],
    address: '0x1234567890123456789012345678901234567890',
    name: 'Token A',
    symbol: 'TA',
    decimals: Number(18),
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    extension: {
      rootAddress: '0x0987654321098765432109876543210987654321',
      rootChainId: 1,
      rootChainURI: 'https://etherscan.io/block/0',
    },
  },
  {
    chainId: 1,
    chainURI: 'https://etherscan.io/block/0',
    tokenId: 'https://lineascan.build/address/',
    tokenType: ['canonical-bridge'],
    address: '0x1234567890123456789012345678901234567890',
    name: 'Token B',
    symbol: 'TB',
    decimals: Number(18),
    createdAt: getCurrentDate(),
    updatedAt: getCurrentDate(),
    extension: {
      rootAddress: '0x0987654321098765432109876543210987654321',
      rootChainId: 1,
      rootChainURI: 'https://etherscan.io/block/0',
    },
  },
];

describe('Token Utils', () => {
  describe('getBumpedVersions', () => {
    it('should bump the minor version', () => {
      const versions: Version[] = [
        { major: 1, minor: 0, patch: 0 },
        { major: 0, minor: 5, patch: 3 },
      ];

      const bumpedVersions = getBumpedVersions(versions);

      expect(bumpedVersions).toEqual([{ major: 1, minor: 1, patch: 0 }]);
    });
  });

  describe('sortAlphabetically', () => {
    it('should sort tokens alphabetically by name', () => {
      const tokens: Token[] = sampleTokenList;

      const sortedTokens = sortAlphabetically(tokens);

      expect(sortedTokens).toEqual([sampleTokenList[1], sampleTokenList[2], sampleTokenList[0]]);
    });
  });
});
