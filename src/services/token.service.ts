import { type PublicClient, type Abi, type Address, getAddress, zeroAddress } from 'viem';

import { ABIType, LineaTokenList, Token, TokenType } from 'src/models/token';
import { isEqual } from 'src/utils/compare';
import { loadABI } from 'src/utils/abi';
import { config } from 'src/config';
import { logger } from 'src/logger';
import { checkTokenErrors, fetchTokenInfo, updateTokenListIfNeeded } from 'src/utils/token';
import { readJsonFile } from 'src/utils/file';
import { normalizeAddress } from 'src/utils/ethereum';

const RESERVED_STATUS: Address = normalizeAddress('0x111');
const VERIFY_BATCH_SIZE = 10;
const ETHEREUM_CHAIN_URI = 'https://etherscan.io/block/0';
const LINEA_CHAIN_URI = 'https://lineascan.build/block/0';
const ETHEREUM_ADDRESS_URI_PREFIX = 'https://etherscan.io/address/';
const LINEA_ADDRESS_URI_PREFIX = 'https://lineascan.build/address/';

/**
 * Token Bridge ABI subset for nativeToBridgedToken function
 */
const TOKEN_BRIDGE_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'nativeToBridgedToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

type BridgeMappings = {
  l1RootStatusMapping: Address;
  l2EthereumToLineaToken: Address;
  l1LineaToEthereumToken: Address;
};

/**
 * Discover ERC20 tokens by processing the Canonical Token Bridge events
 */
export class TokenService {
  tokenList: Token[] = [];
  erc20ContractABI: Abi;
  erc20Byte32ContractABI: Abi;
  private readonly l1BridgeAddress: Address;
  private readonly l2BridgeAddress: Address;

  constructor(
    private l1Client: PublicClient,
    private l2Client: PublicClient
  ) {
    // Load contract ABIs
    this.erc20ContractABI = loadABI(config.ERC20_ABI_PATH);
    this.erc20Byte32ContractABI = loadABI(config.ERC20_BYTE32_ABI_PATH);

    // Validate and store bridge addresses
    this.l1BridgeAddress = getAddress(config.L1_TOKEN_BRIDGE_ADDRESS);
    this.l2BridgeAddress = getAddress(config.L2_TOKEN_BRIDGE_ADDRESS);
  }

  /**
   * Gets the token info, falling back to Byte32 ABI if standard fails
   * @param tokenAddress - Token contract address
   * @param chainId - Chain ID
   * @returns Token info or undefined
   */
  async fetchTokenMetadataWithAbiFallback(tokenAddress: Address, chainId: number): Promise<Token | undefined> {
    const client = chainId === config.ETHEREUM_MAINNET_CHAIN_ID ? this.l1Client : this.l2Client;

    try {
      return await fetchTokenInfo(client, tokenAddress, this.erc20ContractABI, ABIType.STANDARD);
    } catch (error) {
      logger.warn('Error fetching token info with ERC20 ABI', { address: tokenAddress, error });
      try {
        return await fetchTokenInfo(client, tokenAddress, this.erc20Byte32ContractABI, ABIType.BYTE32);
      } catch (error) {
        logger.error('Error fetching token info with ERC20 Byte32 ABI', { address: tokenAddress, error });
        return;
      }
    }
  }

  /**
   * Updates the token info based on the event
   * @param token - Token object to update
   * @param chainId - Chain ID
   * @param tokenAddress - Token address
   * @param nativeTokenAddress - Native token address (for bridged tokens)
   * @param tokenTypes - Token types
   * @returns Updated token
   */
  applyChainMetadata(
    token: Token,
    chainId: number,
    tokenAddress: string,
    nativeTokenAddress: string | undefined,
    tokenTypes: TokenType[]
  ): Token {
    token.address = tokenAddress;
    token.tokenType = tokenTypes;
    const chainData = this.resolveChainMetadata(chainId);
    token.chainId = chainData.chainId;
    token.chainURI = chainData.chainURI;
    token.tokenId = `${chainData.tokenAddressPrefix}${tokenAddress}`;

    if (nativeTokenAddress && token.extension) {
      token.extension.rootChainId = chainData.rootChainId;
      token.extension.rootChainURI = chainData.rootChainURI;
      token.extension.rootAddress = nativeTokenAddress;
    }

    return token;
  }

  /**
   * Adds tokens from the token short list to the token list
   * @param tokenShortList - Token list to merge
   */
  mergeShortlistTokens(tokenShortList: LineaTokenList): void {
    for (const newToken of tokenShortList.tokens) {
      const tokenAddress: Address = getAddress(newToken.address);
      const existingTokenIndex = this.tokenList.findIndex(
        (existingToken) => getAddress(existingToken.address) === tokenAddress
      );

      // If a token exists and is not equal to newToken, replace it.
      // If not exists, add it to the list.
      if (existingTokenIndex !== -1 && !isEqual(this.tokenList[existingTokenIndex], newToken)) {
        this.tokenList[existingTokenIndex] = newToken;
      } else if (existingTokenIndex === -1) {
        this.tokenList.push(newToken);
      }
    }
  }

  /**
   * Verifies the token list
   * @param path - Path to token list JSON
   */
  async verifyList(path: string) {
    logger.info('Verify list', { path });
    const tokenList = readJsonFile(path) as LineaTokenList;
    const checkTokenList: Token[] = JSON.parse(JSON.stringify(tokenList.tokens));

    for (let i = 0; i < checkTokenList.length; i += VERIFY_BATCH_SIZE) {
      const tokenBatch = checkTokenList.slice(i, i + VERIFY_BATCH_SIZE);
      await Promise.all(tokenBatch.map((token, j) => this.verifyAndSyncToken(token, i + j, checkTokenList.length)));
    }

    updateTokenListIfNeeded(path, tokenList, checkTokenList);
  }

  private async verifyAndSyncToken(token: Token, index: number, totalTokens: number): Promise<void> {
    logger.info('Checking token', { name: token.name, position: `${index + 1}/${totalTokens}` });
    const verifiedToken = await this.verifyToken(token);

    if (!verifiedToken) {
      throw new Error('Token not found');
    }

    checkTokenErrors(token, verifiedToken);
    this.syncVerifiedTokenFields(token, verifiedToken);
  }

  private syncVerifiedTokenFields(currentToken: Token, verifiedToken: Token): void {
    if (currentToken.tokenId !== verifiedToken.tokenId) {
      logger.warn('tokenId mismatch', {
        name: currentToken.name,
        currentTokenTokenId: currentToken.tokenId,
        newTokenTokenId: verifiedToken.tokenId,
      });
      currentToken.tokenId = verifiedToken.tokenId;
    }

    if (!isEqual(currentToken.tokenType, verifiedToken.tokenType)) {
      logger.warn('Token type mismatch', {
        name: currentToken.name,
        currentTokenType: currentToken.tokenType,
        newTokenType: verifiedToken.tokenType,
      });
      currentToken.tokenType = verifiedToken.tokenType;
    }
  }

  /**
   * Get a verified token by chainId
   * @param token - Token to verify
   * @returns Verified token or undefined
   */
  async verifyToken(token: Token): Promise<Token | undefined> {
    let verifiedToken: Token | undefined;

    switch (token.chainId) {
      case config.ETHEREUM_MAINNET_CHAIN_ID:
        throw new Error('ChainId not supported yet');
      case config.LINEA_MAINNET_CHAIN_ID:
        try {
          if (!token.extension?.rootAddress) {
            verifiedToken = await this.verifyNativeToken(token);
          } else {
            verifiedToken = await this.verifyTokenWithRootMapping(token);
          }
        } catch (error) {
          logger.error('Error checking token', { name: token.name, error });
          throw error;
        }
        break;
      default:
        throw new Error('Invalid chainId');
    }
    if (verifiedToken && this.shouldCarryExternalBridgeType(token, verifiedToken)) {
      verifiedToken.tokenType.push(TokenType.EXTERNAL_BRIDGE);
    }

    return verifiedToken;
  }

  /**
   * Verifies the token without a root address
   * @param token - Token to verify
   * @returns Verified token or undefined
   */
  private async verifyNativeToken(token: Token): Promise<Token | undefined> {
    const tokenAddress: Address = getAddress(token.address);
    const verifiedToken = await this.fetchTokenMetadataWithAbiFallback(tokenAddress, config.LINEA_MAINNET_CHAIN_ID);
    if (verifiedToken) {
      const updatedToken = this.applyChainMetadata(
        verifiedToken,
        config.LINEA_MAINNET_CHAIN_ID,
        token.address,
        undefined,
        [TokenType.NATIVE]
      );
      delete updatedToken.extension;
      return updatedToken;
    }
    return undefined;
  }

  /**
   * Verifies the token with a root address
   * @param token - Token to verify
   * @returns Verified token or undefined
   */
  private async verifyTokenWithRootMapping(token: Token): Promise<Token | undefined> {
    if (!token.extension?.rootAddress) {
      throw new Error('Extension or rootAddress is undefined');
    }

    const rootAddress: Address = getAddress(token.extension.rootAddress);
    const bridgeMappings = await this.fetchBridgeMappings(token, token.extension.rootChainId, rootAddress);

    const bridgeTokenType = this.classifyBridgeTokenType({
      token,
      rootAddress,
      ...bridgeMappings,
    });

    if (!bridgeTokenType) {
      return token;
    }

    return this.fetchAndApplyVerifiedToken(token, [bridgeTokenType]);
  }

  private async fetchBridgeMappings(token: Token, rootChainId: number, rootAddress: Address): Promise<BridgeMappings> {
    const tokenAddress: Address = getAddress(token.address);
    const [l1RootStatusMapping, l2EthereumToLineaToken, l1LineaToEthereumToken] = await Promise.all([
      this.l1Client.readContract({
        address: this.l1BridgeAddress,
        abi: TOKEN_BRIDGE_ABI,
        functionName: 'nativeToBridgedToken',
        args: [BigInt(rootChainId), rootAddress],
      }),
      this.l2Client.readContract({
        address: this.l2BridgeAddress,
        abi: TOKEN_BRIDGE_ABI,
        functionName: 'nativeToBridgedToken',
        args: [BigInt(rootChainId), rootAddress],
      }),
      this.l1Client.readContract({
        address: this.l1BridgeAddress,
        abi: TOKEN_BRIDGE_ABI,
        functionName: 'nativeToBridgedToken',
        args: [BigInt(token.chainId), tokenAddress],
      }),
    ]);

    return {
      l1RootStatusMapping,
      l2EthereumToLineaToken,
      l1LineaToEthereumToken,
    };
  }

  private classifyBridgeTokenType({
    token,
    rootAddress,
    l1RootStatusMapping,
    l2EthereumToLineaToken,
    l1LineaToEthereumToken,
  }: {
    token: Token;
    rootAddress: Address;
    l1RootStatusMapping: Address;
    l2EthereumToLineaToken: Address;
    l1LineaToEthereumToken: Address;
  }): TokenType | undefined {
    const isEthereumRoot = token.extension?.rootChainId === config.ETHEREUM_MAINNET_CHAIN_ID;
    if (!isEthereumRoot) {
      return undefined;
    }

    if (
      l1RootStatusMapping === RESERVED_STATUS ||
      l2EthereumToLineaToken === RESERVED_STATUS ||
      l1LineaToEthereumToken === RESERVED_STATUS
    ) {
      return TokenType.BRIDGE_RESERVED;
    }

    const isCanonicalFromL1ToL2 = l2EthereumToLineaToken !== zeroAddress;
    const isCanonicalFromL2ToL1 = l1LineaToEthereumToken !== zeroAddress && l1LineaToEthereumToken === rootAddress;

    if (isCanonicalFromL1ToL2 || isCanonicalFromL2ToL1) {
      return TokenType.CANONICAL_BRIDGE;
    }

    return TokenType.EXTERNAL_BRIDGE;
  }

  private shouldCarryExternalBridgeType(originalToken: Token, verifiedToken: Token): boolean {
    return (
      originalToken.tokenType.includes(TokenType.EXTERNAL_BRIDGE) &&
      !verifiedToken.tokenType.includes(TokenType.EXTERNAL_BRIDGE) &&
      !verifiedToken.tokenType.includes(TokenType.CANONICAL_BRIDGE)
    );
  }

  private resolveChainMetadata(chainId: number): {
    chainId: number;
    chainURI: string;
    tokenAddressPrefix: string;
    rootChainId: number;
    rootChainURI: string;
  } {
    if (chainId === config.LINEA_MAINNET_CHAIN_ID) {
      return {
        chainId: config.LINEA_MAINNET_CHAIN_ID,
        chainURI: LINEA_CHAIN_URI,
        tokenAddressPrefix: LINEA_ADDRESS_URI_PREFIX,
        rootChainId: config.ETHEREUM_MAINNET_CHAIN_ID,
        rootChainURI: ETHEREUM_CHAIN_URI,
      };
    }

    return {
      chainId: config.ETHEREUM_MAINNET_CHAIN_ID,
      chainURI: ETHEREUM_CHAIN_URI,
      tokenAddressPrefix: ETHEREUM_ADDRESS_URI_PREFIX,
      rootChainId: config.LINEA_MAINNET_CHAIN_ID,
      rootChainURI: LINEA_CHAIN_URI,
    };
  }

  /**
   * Verifies the token with a reserved status or with a non-zero bridged token
   * @param token - Token to verify
   * @param tokenTypes - Token types to assign
   * @returns Verified token or undefined
   */
  private async fetchAndApplyVerifiedToken(token: Token, tokenTypes: TokenType[]): Promise<Token | undefined> {
    const tokenAddress: Address = getAddress(token.address);
    const verifiedToken = await this.fetchTokenMetadataWithAbiFallback(tokenAddress, config.LINEA_MAINNET_CHAIN_ID);
    if (verifiedToken) {
      return this.applyChainMetadata(
        verifiedToken,
        config.LINEA_MAINNET_CHAIN_ID,
        token.address,
        token.extension?.rootAddress,
        tokenTypes
      );
    }
    return undefined;
  }
}
