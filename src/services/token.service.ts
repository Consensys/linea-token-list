import { Contract, ContractInterface, Event, utils, providers } from 'ethers';
import _ from 'lodash';
import { LineaTokenList, Token } from 'src/models/token';
import { loadABI } from 'src/utils/abi';
import { config } from 'src/config';
import { logger } from 'src/logger';
import { checkTokenExists, fetchTokenInfo, getEventTokenAddresses } from 'src/utils/token';
import { getCurrentDate } from 'src/utils/date';
import { saveJsonFile } from 'src/utils/file';
import { getBumpedVersions, sortAlphabetically } from 'src/utils/list';
import { fetchLogoURI } from 'src/utils/coinGecko';

export class TokenService {
  private tokenList: Token[] = [];
  private erc20ContractABI: ContractInterface;
  private erc20Byte32ContractABI: ContractInterface;
  private l1Contract: Contract;
  private l2Contract: Contract;

  constructor(
    private l1Provider: providers.JsonRpcProvider,
    private lineaProvider: providers.JsonRpcProvider,
    private existingTokenList: LineaTokenList
  ) {
    // Load contract ABIs
    const contractABI = loadABI(config.CONTRACT_ABI_PATH);
    this.erc20ContractABI = loadABI(config.ERC20_ABI_PATH);
    this.erc20Byte32ContractABI = loadABI(config.ERC20_BYTE32_ABI_PATH);

    // Instantiate contracts
    this.l1Contract = new Contract(config.CONTRACT_ADDRESS, contractABI, l1Provider);
    this.l2Contract = new Contract(config.L2_CONTRACT_ADDRESS, contractABI, lineaProvider);
  }

  /**
   * Processes the token events
   */
  async processTokenEvents() {
    const newTokenEventFilter = this.l1Contract.filters.NewToken();
    const newTokenDeployedEventFilter = this.l1Contract.filters.NewTokenDeployed();
    const newTokenEvents = await this.l1Contract.queryFilter(newTokenEventFilter);
    const newTokenDeployedEvents = await this.l1Contract.queryFilter(newTokenDeployedEventFilter);

    const events = [...newTokenEvents, ...newTokenDeployedEvents];
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
  async getContractWithRetry(erc20Address: string, event: Event) {
    try {
      const erc20Contract = new Contract(erc20Address, this.erc20ContractABI, this.l1Provider);
      return await fetchTokenInfo(erc20Contract, event.event);
    } catch (error) {
      logger.warn('Error fetching token info with ERC20 ABI', { address: erc20Address, error });
      try {
        const erc20AltContract = new Contract(erc20Address, this.erc20Byte32ContractABI, this.l1Provider);
        return await fetchTokenInfo(erc20AltContract, event.event);
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
  async processTokenEvent(event: Event) {
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
  async updateTokenInfo(token: Token, event: Event, tokenAddress: string, nativeTokenAddress: string | undefined) {
    if (event.event === 'NewTokenDeployed') {
      token.address = tokenAddress;
      token.chainId = config.ETHEREUM_MAINNET_CHAIN_ID;
      token.tokenId = `https://etherscan.io/address/${tokenAddress}`;
      if (token.extension && nativeTokenAddress) {
        token.extension.rootChainId = config.LINEA_MAINNET_CHAIN_ID;
        token.extension.rootChainURI = 'https://lineascan.build/block/0';
        token.extension.rootAddress = nativeTokenAddress;
      }
    } else {
      const address = await this.getTokenAddressFromMapping(tokenAddress);
      token.address = address;
      token.tokenId = `https://lineascan.build/address/${address}`;
    }
    return token;
  }

  /**
   * Fetches the token logo from CoinGecko
   * @param token
   * @returns
   */
  async fetchAndAssignTokenLogo(token: Token) {
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
   * Gets the token address from the mapping contract
   * @param nativeAddress
   * @returns
   */
  async getTokenAddressFromMapping(nativeAddress: string): Promise<string> {
    try {
      let tokenAddress = await this.l2Contract.nativeToBridgedToken(1, nativeAddress);
      tokenAddress = utils.getAddress(tokenAddress);
      return tokenAddress;
    } catch (error) {
      logger.error('Error calling nativeToBridgedToken', { error });
      throw error;
    }
  }

  /**
   * Adds tokens from the token short list to the token list
   */
  concatTokenShortList(tokenShortList: LineaTokenList) {
    for (const newToken of tokenShortList.tokens) {
      const tokenAddress = utils.getAddress(newToken.address);
      // Find the index of the existing token in the list
      const existingTokenIndex = this.tokenList.findIndex(
        (existingToken) => utils.getAddress(existingToken.address) === tokenAddress
      );

      // If token exists and is not equal to newToken, replace it.
      // If not exists, add it to the list.
      if (existingTokenIndex !== -1 && !_.isEqual(this.tokenList[existingTokenIndex], newToken)) {
        this.tokenList[existingTokenIndex] = newToken;
      } else {
        this.tokenList.push(newToken);
      }
    }
  }

  /**
   * Sorts the token list alphabetically and saves it to the token list file
   * @returns
   */
  exportTokenList() {
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
}
