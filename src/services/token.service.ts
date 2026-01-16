import { type PublicClient, type Abi, type Address, getAddress, zeroAddress } from 'viem';

import { ABIType, LineaTokenList, Token, TokenType } from 'src/models/token';
import { isEqual } from 'src/utils/compare';
import { loadABI } from 'src/utils/abi';
import { config } from 'src/config';
import { logger } from 'src/logger';
import { checkTokenErrors, fetchTokenInfo, updateTokenListIfNeeded } from 'src/utils/token';
import { readJsonFile } from 'src/utils/file';
import { CryptoService, fetchLogoURI } from 'src/utils/logo';
import { normalizeAddress } from 'src/utils/ethereum';

const RESERVED_STATUS: Address = normalizeAddress('0x111');
const VERIFY_BATCH_SIZE = 10;

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
  async getContractWithRetry(tokenAddress: Address, chainId: number): Promise<Token | undefined> {
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
  updateTokenInfo(
    token: Token,
    chainId: number,
    tokenAddress: string,
    nativeTokenAddress: string | undefined,
    tokenTypes: TokenType[]
  ): Token {
    token.address = tokenAddress;
    token.tokenType = tokenTypes;
    if (chainId === config.LINEA_MAINNET_CHAIN_ID) {
      token.chainId = config.LINEA_MAINNET_CHAIN_ID;
      token.chainURI = 'https://lineascan.build/block/0';
      token.tokenId = `https://lineascan.build/address/${tokenAddress}`;
      if (nativeTokenAddress && token.extension) {
        token.extension.rootChainId = config.ETHEREUM_MAINNET_CHAIN_ID;
        token.extension.rootChainURI = 'https://etherscan.io/block/0';
        token.extension.rootAddress = nativeTokenAddress;
      }
    } else {
      token.chainId = config.ETHEREUM_MAINNET_CHAIN_ID;
      token.chainURI = 'https://etherscan.io/block/0';
      token.tokenId = `https://etherscan.io/address/${tokenAddress}`;
      if (nativeTokenAddress && token.extension) {
        token.extension.rootChainId = config.LINEA_MAINNET_CHAIN_ID;
        token.extension.rootChainURI = 'https://lineascan.build/block/0';
        token.extension.rootAddress = nativeTokenAddress;
      }
    }

    return token;
  }

  /**
   * Fetches the token logo from CoinGecko
   * @param token - Token object
   * @returns Token with logo or undefined
   */
  async fetchAndAssignTokenLogo(token: Token): Promise<Token | undefined> {
    try {
      const logoURIFromCoinGecko = await fetchLogoURI(token, CryptoService.COINGECKO);
      if (logoURIFromCoinGecko) {
        token.logoURI = logoURIFromCoinGecko;
      }
      return token;
    } catch {
      logger.warn('Error fetching logoURI, skip token until next script execution', {
        name: token.name,
      });
      return undefined;
    }
  }

  /**
   * Adds tokens from the token short list to the token list
   * @param tokenShortList - Token list to merge
   */
  concatTokenShortList(tokenShortList: LineaTokenList): void {
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
    const tokenList = readJsonFile(path);
    const checkTokenList = JSON.parse(JSON.stringify(tokenList.tokens));

    const verifyTokenInBatch = async (token: Token, index: number) => {
      logger.info('Checking token', { name: token.name, position: `${index + 1}/${checkTokenList.length}` });
      const verifiedToken: Token | undefined = await this.verifyToken(token);

      if (!verifiedToken) {
        throw new Error('Token not found');
      }
      checkTokenErrors(token, verifiedToken);

      if (token.tokenId !== verifiedToken.tokenId) {
        logger.warn('tokenId mismatch', {
          name: token.name,
          currentTokenTokenId: token.tokenId,
          newTokenTokenId: verifiedToken.tokenId,
        });
        token.tokenId = verifiedToken.tokenId;
      }

      if (!isEqual(token.tokenType, verifiedToken.tokenType)) {
        logger.warn('Token type mismatch', {
          name: token.name,
          currentTokenType: token.tokenType,
          newTokenType: verifiedToken.tokenType,
        });
        token.tokenType = verifiedToken.tokenType;
      }
    };

    for (let i = 0; i < checkTokenList.length; i += VERIFY_BATCH_SIZE) {
      // Get the next batch of tokens
      const tokenBatch = checkTokenList.slice(i, i + VERIFY_BATCH_SIZE);
      // Process each token in the batch in parallel and wait for all to finish
      await Promise.all(tokenBatch.map((token: Token, j: number) => verifyTokenInBatch(token, i + j)));
    }

    updateTokenListIfNeeded(path, tokenList, checkTokenList);
  }

  /**
   * Get a verified token by chainId
   * @param token - Token to verify
   * @returns Verified token or undefined
   */
  async verifyToken(token: Token): Promise<Token | undefined> {
    let verifiedToken: Token | undefined = {} as Token;

    switch (token.chainId) {
      case config.ETHEREUM_MAINNET_CHAIN_ID:
        throw new Error('ChainId not supported yet');
      case config.LINEA_MAINNET_CHAIN_ID:
        try {
          if (!token.extension?.rootAddress) {
            verifiedToken = await this.verifyWithoutRootAddress(token, verifiedToken);
          } else {
            verifiedToken = await this.verifyWithRootAddress(token, verifiedToken);
          }
        } catch (error) {
          logger.error('Error checking token', { name: token.name, error });
          throw error;
        }
        break;
      default:
        throw new Error('Invalid chainId');
    }
    if (
      verifiedToken &&
      token.tokenType.includes('external-bridge') &&
      !verifiedToken.tokenType.includes('external-bridge')
    ) {
      verifiedToken.tokenType.push('external-bridge');
    }

    return verifiedToken;
  }

  /**
   * Verifies the token without a root address
   * @param token - Token to verify
   * @param verifiedToken - Placeholder for verified token
   * @returns Verified token or undefined
   */
  private async verifyWithoutRootAddress(token: Token, verifiedToken: Token | undefined): Promise<Token | undefined> {
    const tokenAddress: Address = getAddress(token.address);
    verifiedToken = await this.getContractWithRetry(tokenAddress, config.LINEA_MAINNET_CHAIN_ID);
    if (verifiedToken) {
      verifiedToken = this.updateTokenInfo(verifiedToken, config.LINEA_MAINNET_CHAIN_ID, token.address, undefined, [
        TokenType.NATIVE,
      ]);
      delete verifiedToken.extension;
    }
    return verifiedToken;
  }

  /**
   * Verifies the token with a root address
   * @param token - Token to verify
   * @param verifiedToken - Placeholder for verified token
   * @returns Verified token or undefined
   */
  private async verifyWithRootAddress(token: Token, verifiedToken: Token | undefined): Promise<Token | undefined> {
    if (!token.extension?.rootAddress) {
      throw new Error('Extension or rootAddress is undefined');
    }

    const rootAddress: Address = getAddress(token.extension.rootAddress);

    const l1nativeToBridgedToken = await this.l1Client.readContract({
      address: this.l1BridgeAddress,
      abi: TOKEN_BRIDGE_ABI,
      functionName: 'nativeToBridgedToken',
      args: [BigInt(token.extension.rootChainId), rootAddress],
    });

    const l2nativeToBridgedToken = await this.l2Client.readContract({
      address: this.l2BridgeAddress,
      abi: TOKEN_BRIDGE_ABI,
      functionName: 'nativeToBridgedToken',
      args: [BigInt(token.extension.rootChainId), rootAddress],
    });

    if (l1nativeToBridgedToken === RESERVED_STATUS) {
      if (token.extension.rootChainId === config.ETHEREUM_MAINNET_CHAIN_ID) {
        verifiedToken = await this.getVerifiedTokenInfo(token, verifiedToken, [TokenType.BRIDGE_RESERVED]);
      } else {
        verifiedToken = token;
      }
    } else if (l2nativeToBridgedToken !== zeroAddress) {
      verifiedToken = await this.getVerifiedTokenInfo(token, verifiedToken, [TokenType.CANONICAL_BRIDGE]);
    } else {
      if (token.extension.rootChainId === config.ETHEREUM_MAINNET_CHAIN_ID) {
        verifiedToken = await this.getVerifiedTokenInfo(token, verifiedToken, [TokenType.EXTERNAL_BRIDGE]);
      } else {
        verifiedToken = token;
      }
    }

    return verifiedToken;
  }

  /**
   * Verifies the token with a reserved status or with a non-zero bridged token
   * @param token - Token to verify
   * @param verifiedToken - Placeholder for verified token
   * @param tokenTypes - Token types to assign
   * @returns Verified token or undefined
   */
  private async getVerifiedTokenInfo(
    token: Token,
    verifiedToken: Token | undefined,
    tokenTypes: TokenType[]
  ): Promise<Token | undefined> {
    const tokenAddress: Address = getAddress(token.address);
    verifiedToken = await this.getContractWithRetry(tokenAddress, config.LINEA_MAINNET_CHAIN_ID);
    if (verifiedToken) {
      verifiedToken = this.updateTokenInfo(
        verifiedToken,
        config.LINEA_MAINNET_CHAIN_ID,
        token.address,
        token.extension?.rootAddress,
        tokenTypes
      );
    }
    return verifiedToken;
  }
}
