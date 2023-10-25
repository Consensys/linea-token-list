import { Contract, ContractInterface, Event, utils, providers, constants } from 'ethers';
import _ from 'lodash';

import { ABIType, LineaTokenList, Token, TokenType } from 'src/models/token';
import { loadABI } from 'src/utils/abi';
import { config } from 'src/config';
import { logger } from 'src/logger';
import {
  checkTokenErrors,
  checkTokenExists,
  fetchTokenInfo,
  getEventTokenAddresses,
  updateTokenListIfNeeded,
} from 'src/utils/token';
import { getCurrentDate } from 'src/utils/date';
import { readJsonFile, saveJsonFile } from 'src/utils/file';
import { getBumpedVersions, sortAlphabetically } from 'src/utils/list';
import { CryptoService, fetchLogoURI } from 'src/utils/logo';
import { EventExtended } from 'src/models/event';
import { normalizeAddress } from 'src/utils/ethereum';

const RESERVED_STATUS = normalizeAddress('0x111');
const VERIFY_BATCH_SIZE = 10;

/**
 * Discover ERC20 tokens by processing the Canonical Token Bridge events
 */
export class TokenService {
  tokenList: Token[] = [];
  erc20ContractABI: ContractInterface;
  erc20Byte32ContractABI: ContractInterface;
  private l1Contract: Contract;
  private l2Contract: Contract;

  constructor(
    private l1Provider: providers.JsonRpcProvider,
    private l2Provider: providers.JsonRpcProvider,
    private existingTokenList: LineaTokenList
  ) {
    // Load contract ABIs
    const contractABI = loadABI(config.TOKEN_BRIDGE_ABI_PATH);
    this.erc20ContractABI = loadABI(config.ERC20_ABI_PATH);
    this.erc20Byte32ContractABI = loadABI(config.ERC20_BYTE32_ABI_PATH);

    // Instantiate contracts
    this.l1Contract = new Contract(config.L1_TOKEN_BRIDGE_ADDRESS, contractABI, l1Provider);
    this.l2Contract = new Contract(config.L2_TOKEN_BRIDGE_ADDRESS, contractABI, l2Provider);
  }

  /**
   * Processes the token events
   */
  async processTokenEvents(): Promise<void> {
    const newTokenDeployedL1EventFilter = this.l1Contract.filters.NewTokenDeployed();
    const newTokenDeployedL2EventFilter = this.l2Contract.filters.NewTokenDeployed();
    const rawL1Events: Event[] = await this.l1Contract.queryFilter(newTokenDeployedL1EventFilter);
    const rawL2Events: Event[] = await this.l2Contract.queryFilter(newTokenDeployedL2EventFilter);

    // Add chainId to events
    const newTokenDeployedL1Events: EventExtended[] = rawL1Events.map((event) => ({
      ...event,
      chainId: config.ETHEREUM_MAINNET_CHAIN_ID,
    }));
    const newTokenDeployedL2Events: EventExtended[] = rawL2Events.map((event) => ({
      ...event,
      chainId: config.LINEA_MAINNET_CHAIN_ID,
    }));

    const events = [...newTokenDeployedL1Events, ...newTokenDeployedL2Events];
    for (const event of events) {
      try {
        const token = await this.processTokenEvent(event);
        if (token) {
          logger.info('Add new token', { name: token.name });
          this.tokenList.push(token);
        }
      } catch (error) {
        logger.error('Error processing token event, skip', { error });
      }
    }
  }

  /**
   * Gets the contract with the ERC20 ABI or the ERC20 Byte32 ABI
   * @param tokenAddress
   * @param chainId
   * @returns
   */
  async getContractWithRetry(tokenAddress: string, chainId: number): Promise<Token | undefined> {
    const provider = chainId === config.ETHEREUM_MAINNET_CHAIN_ID ? this.l1Provider : this.l2Provider;
    try {
      const erc20Contract = new Contract(tokenAddress, this.erc20ContractABI, provider);
      return await fetchTokenInfo(erc20Contract, ABIType.STANDARD);
    } catch (error) {
      logger.warn('Error fetching token info with ERC20 ABI', { address: tokenAddress, error });
      try {
        const erc20AltContract = new Contract(tokenAddress, this.erc20Byte32ContractABI, provider);
        return await fetchTokenInfo(erc20AltContract, ABIType.BYTE32);
      } catch (error) {
        logger.error('Error fetching token info with ERC20 Byte32 ABI', { address: tokenAddress, error });
        return;
      }
    }
  }

  /**
   * Processes the token event
   * @param event
   * @returns
   */
  async processTokenEvent(event: EventExtended): Promise<Token | undefined> {
    const { tokenAddress, nativeTokenAddress } = getEventTokenAddresses(event);
    const tokenExists = checkTokenExists(this.existingTokenList.tokens, tokenAddress);
    if (tokenExists) {
      logger.info('Token already exists', { name: tokenExists.name, tokenAddress });
      return tokenExists;
    } else {
      logger.info('New token found', { tokenAddress });
    }

    let token = await this.getContractWithRetry(tokenAddress, event.chainId);
    if (token) {
      token = this.updateTokenInfo(token, event.chainId, tokenAddress, nativeTokenAddress, [
        TokenType.CANONICAL_BRIDGE,
      ]);
      token = await this.fetchAndAssignTokenLogo(token);
      logger.info('ERC20 info fetched', { token });
      return token;
    }
  }

  /**
   * Updates the token info based on the event
   * @param token
   * @param event
   * @param tokenAddress
   * @param nativeTokenAddress
   * @returns
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
   * @param token
   * @returns
   */
  async fetchAndAssignTokenLogo(token: Token): Promise<Token | undefined> {
    try {
      const logoURIfromCoinGecko = await fetchLogoURI(token, CryptoService.COINGECKO);
      if (logoURIfromCoinGecko) {
        token.logoURI = logoURIfromCoinGecko;
      }
      return token;
    } catch (error) {
      logger.warn('Error fetching logoURI, skip token until next script execution', {
        name: token.name,
      });
      return undefined;
    }
  }

  /**
   * Adds tokens from the token short list to the token list
   * @param tokenShortList
   */
  concatTokenShortList(tokenShortList: LineaTokenList): void {
    for (const newToken of tokenShortList.tokens) {
      const tokenAddress = utils.getAddress(newToken.address);
      const existingTokenIndex = this.tokenList.findIndex(
        (existingToken) => utils.getAddress(existingToken.address) === tokenAddress
      );

      // If token exists and is not equal to newToken, replace it.
      // If not exists, add it to the list.
      if (existingTokenIndex !== -1 && !_.isEqual(this.tokenList[existingTokenIndex], newToken)) {
        this.tokenList[existingTokenIndex] = newToken;
      } else if (existingTokenIndex === -1) {
        this.tokenList.push(newToken);
      }
    }
  }

  /**
   * Sorts the token list alphabetically and saves it to the token list file
   */
  exportTokenList(): void {
    this.tokenList = sortAlphabetically(this.tokenList);
    if (_.isEqual(this.existingTokenList.tokens, this.tokenList)) {
      logger.info('No new tokens to add');
      return;
    }

    const newTokenList = {
      ...this.existingTokenList,
      updatedAt: getCurrentDate(),
      versions: getBumpedVersions(this.existingTokenList.versions),
      tokens: this.tokenList,
    };
    newTokenList.tokens = sortAlphabetically(newTokenList.tokens);

    saveJsonFile(config.TOKEN_FULL_LIST_PATH, newTokenList);
    logger.info('Token list updated', {
      path: config.TOKEN_FULL_LIST_PATH,
      previousTokenCounter: this.existingTokenList.tokens.length,
      newTokenCounter: newTokenList.tokens.length,
    });
  }

  /**
   * Verifies the token list
   * @param path
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
          currentTokennTokenId: token.tokenId,
          newTokenTokenId: verifiedToken.tokenId,
        });
        token.tokenId = verifiedToken.tokenId;
      }

      if (!_.isEqual(token.tokenType, verifiedToken.tokenType)) {
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
   * @param token
   * @returns
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
    if (verifiedToken && token.tokenType.includes('external-bridge')) {
      verifiedToken.tokenType.push('external-bridge');
    }

    return verifiedToken;
  }

  /**
   * Verifies the token without a root address
   * @param token
   * @param verifiedToken
   * @returns
   */
  private async verifyWithoutRootAddress(token: Token, verifiedToken: Token | undefined): Promise<Token | undefined> {
    verifiedToken = await this.getContractWithRetry(token.address, config.LINEA_MAINNET_CHAIN_ID);
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
   * @param token
   * @param verifiedToken
   * @returns
   */
  private async verifyWithRootAddress(token: Token, verifiedToken: Token | undefined): Promise<Token | undefined> {
    if (!token.extension?.rootAddress) {
      throw new Error('Extension or rootAddress is undefined');
    }

    const tokenAddress = utils.getAddress(token.extension.rootAddress);
    const l1nativeToBridgedToken = await this.l1Contract.nativeToBridgedToken(1, tokenAddress);
    const l2nativeToBridgedToken = await this.l2Contract.nativeToBridgedToken(1, tokenAddress);

    if (l1nativeToBridgedToken === RESERVED_STATUS) {
      verifiedToken = await this.getVerifiedTokenInfo(token, verifiedToken, [TokenType.BRIDGE_RESERVED]);
    } else if (l2nativeToBridgedToken !== constants.AddressZero) {
      verifiedToken = await this.getVerifiedTokenInfo(token, verifiedToken, [TokenType.CANONICAL_BRIDGE]);
    }
    return verifiedToken;
  }

  /**
   * Verifies the token with a reserved status or with a non-zero bridged token
   * @param token
   * @param verifiedToken
   * @param tokenTypes
   * @returns
   */
  private async getVerifiedTokenInfo(
    token: Token,
    verifiedToken: Token | undefined,
    tokenTypes: TokenType[]
  ): Promise<Token | undefined> {
    verifiedToken = await this.getContractWithRetry(token.address, config.LINEA_MAINNET_CHAIN_ID);
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
