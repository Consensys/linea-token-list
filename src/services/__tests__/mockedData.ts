import { LineaTokenList } from 'src/models/token';

export const mockTokenShortlist: LineaTokenList = {
  type: 'LineaTokenList',
  tokenListId:
    'https://raw.githubusercontent.com/Consensys/linea-token-list/main/json/linea-mainnet-token-shortlist.json',
  name: 'Linea Mainnet Token List',
  createdAt: '2023-07-13',
  updatedAt: '2023-10-13',
  versions: [
    {
      major: 1,
      minor: 11,
      patch: 0,
    },
  ],
  tokens: [
    {
      chainId: 59144,
      chainURI: 'https://lineascan.build/block/0',
      tokenId: 'https://lineascan.build/address/0x6bAA318CF7C51C76e17ae1EbE9Bbff96AE017aCB',
      tokenType: ['canonical-bridge'],
      address: '0x6bAA318CF7C51C76e17ae1EbE9Bbff96AE017aCB',
      name: 'ApeCoin',
      symbol: 'APE',
      decimals: 18,
      createdAt: '2023-08-08',
      updatedAt: '2023-08-08',
      logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/18876.png',
      extension: {
        rootChainId: 1,
        rootChainURI: 'https://etherscan.io/block/0',
        rootAddress: '0x4d224452801aced8b2f0aebe155379bb5d594381',
      },
    },
    {
      chainId: 59144,
      chainURI: 'https://lineascan.build/block/0',
      tokenId: 'https://lineascan.build/address/0x5B16228B94b68C7cE33AF2ACc5663eBdE4dCFA2d',
      tokenType: ['canonical-bridge'],
      address: '0x5B16228B94b68C7cE33AF2ACc5663eBdE4dCFA2d',
      name: 'ChainLink Token',
      symbol: 'LINK',
      decimals: 18,
      createdAt: '2023-08-08',
      updatedAt: '2023-08-08',
      logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1975.png',
      extension: {
        rootChainId: 1,
        rootChainURI: 'https://etherscan.io/block/0',
        rootAddress: '0x514910771af9ca656af840dff83e8264ecf986ca',
      },
    },
  ],
};

export const mockExistingTokenList = [
  {
    chainId: 59144,
    chainURI: 'https://lineascan.build/block/0',
    tokenId: 'https://lineascan.build/address/0x1578f35532FA091EcED8638730F9dB829930ce16',
    tokenType: ['canonical-bridge'],
    address: '0x1578f35532FA091EcED8638730F9dB829930ce16',
    name: 'Angle Protocol',
    symbol: 'agEUR',
    decimals: 18,
    createdAt: '2023-08-22',
    updatedAt: '2023-08-22',
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/15024.png',
    extension: {
      rootChainId: 1,
      rootChainURI: 'https://etherscan.io/block/0',
      rootAddress: '0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8',
    },
  },
];
