import { Contract, ContractInterface, Event, utils, providers } from 'ethers';
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
import { EventCustom } from 'src/models/event';

/**
 * Service to discover ERC20 tokens by processing the Canonical Token Bridge events
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
    const newTokenDeployedL1Events: EventCustom[] = await this.l1Contract.queryFilter(newTokenDeployedL1EventFilter);
    const newTokenDeployedL2Events: EventCustom[] = await this.l2Contract.queryFilter(newTokenDeployedL2EventFilter);

    newTokenDeployedL1Events.map((event) => {
      event.chainId = config.ETHEREUM_MAINNET_CHAIN_ID;
      return event;
    });
    newTokenDeployedL2Events.map((event) => {
      event.chainId = config.LINEA_MAINNET_CHAIN_ID;
      return event;
    });

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
   * @param event
   * @returns
   */
  async getContractWithRetry(erc20Address: string, event: EventCustom): Promise<Token | undefined> {
    const provider = event.chainId === config.ETHEREUM_MAINNET_CHAIN_ID ? this.l1Provider : this.l2Provider;
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
  async processTokenEvent(event: Event): Promise<Token | undefined> {
    const { tokenAddress, nativeTokenAddress } = getEventTokenAddresses(event);
    const tokenExists = checkTokenExists(this.existingTokenList.tokens, tokenAddress);
    if (tokenExists) {
      logger.info('Token already exists', { name: tokenExists.name, tokenAddress });
      return tokenExists;
    } else {
      logger.info('New token found', { tokenAddress });
    }

    let token = await this.getContractWithRetry(tokenAddress, event);
    if (token) {
      token = await this.updateTokenInfo(token, event, tokenAddress, nativeTokenAddress);
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
  async updateTokenInfo(
    token: Token,
    event: EventCustom,
    tokenAddress: string,
    nativeTokenAddress: string
  ): Promise<Token> {
    token.address = tokenAddress;
    token.tokenType.push(TokenType.CANONICAL_BRIDGE);
    if (event.chainId === config.LINEA_MAINNET_CHAIN_ID) {
      token.chainId = config.LINEA_MAINNET_CHAIN_ID;
      token.chainURI = 'https://lineascan.build/block/0';
      token.tokenId = `https://lineascan.build/address/${tokenAddress}`;
      if (token.extension) {
        token.extension.rootChainId = config.ETHEREUM_MAINNET_CHAIN_ID;
        token.extension.rootChainURI = 'https://etherscan.io';
        token.extension.rootAddress = nativeTokenAddress;
      }
    } else {
      token.chainId = config.ETHEREUM_MAINNET_CHAIN_ID;
      token.chainURI = 'https://etherscan.io/block/0';
      token.tokenId = `https://etherscan.io/address/${tokenAddress}`;
      if (token.extension) {
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

    saveJsonFile(config.TOKEN_LIST_PATH, newTokenList);
    logger.info('Token list updated', {
      path: config.TOKEN_LIST_PATH,
      previousTokenCounter: this.existingTokenList.tokens.length,
      newTokenCounter: newTokenList.tokens.length,
    });
  }

  async verifyList(path: string) {
    const tokenList = readJsonFile(config.TOKEN_SHORT_LIST_PATH);

    for (const token of tokenList.tokens) {
      console.log('========');
      console.log(token.name);

      if (token.chainId === config.ETHEREUM_MAINNET_CHAIN_ID) {
        //
      } else {
        try {
          const erc20ContractABI = loadABI(config.ERC20_ABI_PATH);
          const tokenAddress = utils.getAddress(token.extension.rootAddress);
          const l1Contract = new Contract(tokenAddress, erc20ContractABI, this.l1Provider);
          const toto = await fetchTokenInfo(l1Contract, ABIType.STANDARD);
          console.log('=>', toto);
        } catch (error) {
          console.log(error);
        }

        //
      }
    }
  }
}
