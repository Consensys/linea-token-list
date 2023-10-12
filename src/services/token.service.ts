import { Contract, ContractInterface, Event, utils, providers, constants } from 'ethers';
import _ from 'lodash';
import { ABIType, LineaTokenList, Token, TokenType } from 'src/models/token';
import { loadABI } from 'src/utils/abi';
import { config } from 'src/config';
import { logger } from 'src/logger';
import { checkTokenExists, fetchTokenInfo, getEventTokenAddresses } from 'src/utils/token';
import { getCurrentDate } from 'src/utils/date';
import { readJsonFile, saveJsonFile } from 'src/utils/file';
import { getBumpedVersions, sortAlphabetically } from 'src/utils/list';
import { fetchLogoURI } from 'src/utils/coinGecko';
import { EventExtended } from 'src/models/event';
import { normalizeAddress } from 'src/utils/ethereum';
import { th } from 'date-fns/locale';

const RESERVED_STATUS = normalizeAddress('0x111');

/**
 * Discover ERC20 tokens by processing the Canonical Token Bridge events
 */
export class TokenService {
  private tokenList: Token[] = [];
  private erc20ContractABI: ContractInterface;
  private erc20Byte32ContractABI: ContractInterface;
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
   * @param erc20Address
   * @param chainId
   * @returns
   */
  async getContractWithRetry(erc20Address: string, chainId: number): Promise<Token | undefined> {
    const provider = chainId === config.ETHEREUM_MAINNET_CHAIN_ID ? this.l1Provider : this.l2Provider;
    try {
      const erc20Contract = new Contract(erc20Address, this.erc20ContractABI, provider);
      return await fetchTokenInfo(erc20Contract, ABIType.STANDARD);
    } catch (error) {
      logger.warn('Error fetching token info with ERC20 ABI', { address: erc20Address, error });
      try {
        const erc20AltContract = new Contract(erc20Address, this.erc20Byte32ContractABI, provider);
        return await fetchTokenInfo(erc20AltContract, ABIType.BYTE32);
      } catch (error) {
        logger.error('Error fetching token info with ERC20 Byte32 ABI', { address: erc20Address, error });
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
      const logoURIfromCoinGecko = await fetchLogoURI(token);
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
      // Find the index of the existing token in the list
      const existingToken = this.tokenList.find(
        (existingToken) => utils.getAddress(existingToken.address) === tokenAddress
      );

      // If not exists, add it to the list.
      if (!existingToken) {
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

    saveJsonFile(config.TOKEN_FULL_LIST_PATH, newTokenList);
    logger.info('Token list updated', {
      path: config.TOKEN_FULL_LIST_PATH,
      previousTokenCounter: this.existingTokenList.tokens.length,
      newTokenCounter: newTokenList.tokens.length,
    });
  }

  async verifyList(path: string) {
    logger.info('Verify list', { path });
    const tokenList = readJsonFile(path);
    const checkTokenList = JSON.parse(JSON.stringify(tokenList.tokens));
    let index = 0;
    for (const token of checkTokenList) {
      index++;
      logger.info('Checking token', { name: token.name, position: `${index}/${checkTokenList.length}` });
      let verifiedToken: Token | undefined = {} as Token;
      switch (token.chainId) {
        case config.LINEA_MAINNET_CHAIN_ID:
          try {
            if (!token.extension?.rootAddress) {
              verifiedToken = await this.getContractWithRetry(token.address, config.LINEA_MAINNET_CHAIN_ID);
              if (verifiedToken) {
                verifiedToken = this.updateTokenInfo(
                  verifiedToken,
                  config.LINEA_MAINNET_CHAIN_ID,
                  token.address,
                  undefined,
                  [TokenType.NATIVE]
                );
                delete verifiedToken.extension;
              }
            } else {
              const tokenAddress = utils.getAddress(token.extension.rootAddress);
              const l1nativeToBridgedToken = await this.l1Contract.nativeToBridgedToken(1, tokenAddress);
              const l2nativeToBridgedToken = await this.l2Contract.nativeToBridgedToken(1, tokenAddress);

              if (l1nativeToBridgedToken === RESERVED_STATUS) {
                verifiedToken = await this.getContractWithRetry(token.address, config.LINEA_MAINNET_CHAIN_ID);
                if (verifiedToken) {
                  verifiedToken = this.updateTokenInfo(
                    verifiedToken,
                    config.LINEA_MAINNET_CHAIN_ID,
                    token.address,
                    token.extension?.rootAddress,
                    [TokenType.BRIDGE_RESERVED, TokenType.EXTERNAL_BRIDGE]
                  );
                }
              } else if (l2nativeToBridgedToken !== constants.AddressZero) {
                verifiedToken = await this.getContractWithRetry(token.address, config.LINEA_MAINNET_CHAIN_ID);
                if (verifiedToken) {
                  verifiedToken = this.updateTokenInfo(
                    verifiedToken,
                    config.LINEA_MAINNET_CHAIN_ID,
                    token.address,
                    token.extension?.rootAddress,
                    [TokenType.CANONICAL_BRIDGE]
                  );
                }
              }
            }
          } catch (error) {
            logger.error('Error checking token', { name: token.name, error });
            throw error;
          }
          break;
        default:
          throw new Error('Invalid chainId');
      }

      // Error checking
      if (!verifiedToken) {
        throw new Error('Token not found');
      } else if (token.address !== verifiedToken.address) {
        logger.error('address mismatch', {
          name: token.name,
          currentTokenAddress: token.address,
          newTokenAddress: verifiedToken.address,
        });
        throw new Error('address mismatch');
      } else if (token.extension?.rootAddress !== verifiedToken.extension?.rootAddress) {
        logger.error('rootAddress mismatch', {
          name: token.name,
          currentTokenRootAddress: token.extension?.rootAddress,
          newTokenRootAddress: verifiedToken.extension?.rootAddress,
        });
        throw new Error('rootAddress mismatch');
      } else if (token.symbol !== verifiedToken.symbol) {
        logger.error('symbol mismatch', {
          name: token.name,
          currentTokenSymbol: token.symbol,
          newTokenSymbol: verifiedToken.symbol,
        });
        throw new Error('symbol mismatch');
      } else if (token.decimals !== verifiedToken.decimals) {
        logger.error('decimals mismatch', {
          name: token.name,
          currentTokenDecimals: token.decimals,
          newTokenDecimals: verifiedToken.decimals,
        });
        throw new Error('decimals mismatch');
      }

      // Auto modify
      if (token.tokenId !== verifiedToken.tokenId) {
        logger.warn('tokenId mismatch', {
          name: token.name,
          currentTokennTokenId: token.tokenId,
          newTokenTokenId: verifiedToken.tokenId,
        });
        token.tokenId = verifiedToken.tokenId;
      } else if (!_.isEqual(token.tokenType, verifiedToken.tokenType)) {
        logger.warn('Token type mismatch', {
          name: token.name,
          currentTokenType: token.tokenType,
          newTokenType: verifiedToken.tokenType,
        });
        token.tokenType = verifiedToken.tokenType;
      }
    }

    if (_.isEqual(tokenList.tokens, checkTokenList)) {
      logger.info('Token list matching');
    } else {
      logger.warn('Token list not matching');
      const newTokenList = {
        ...this.tokenList,
        updatedAt: getCurrentDate(),
        versions: getBumpedVersions(this.existingTokenList.versions),
        tokens: checkTokenList,
      };
      saveJsonFile(path, newTokenList);
      logger.info('Token list updated', {
        path,
      });
    }
  }
}
