/* istanbul ignore file */

export enum ABIType {
  STANDARD = 'standard',
  BYTE32 = 'byte32',
}

export enum TokenType {
  CANONICAL_BRIDGE = 'canonical-bridge',
  BRIDGE_RESERVED = 'bridge-reserved',
  EXTERNAL_BRIDGE = 'external-bridge',
  NATIVE = 'native',
}

export interface Token {
  chainId: number;
  chainURI: string;
  tokenId: string;
  tokenType: string[];
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  createdAt: string;
  updatedAt: string;
  logoURI?: string;
  extension?: {
    rootChainId: number;
    rootChainURI: string;
    rootAddress: string;
  };
}

export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export interface LineaTokenList {
  type: string;
  tokenListId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  versions: Version[];
  tokens: Token[];
}
