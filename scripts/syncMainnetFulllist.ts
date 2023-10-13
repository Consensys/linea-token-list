import 'module-alias/register';
import { ethers } from 'ethers';
import { config } from 'src/config';
import { logger } from 'src/logger';
import { readJsonFile } from 'src/utils/file';
import { TokenService } from 'src/services/token.service';
import { validateConfig } from 'src/utils/validation';

async function main() {
  try {
    logger.info('Starting sync mainnet fulllist');
    validateConfig(config);

    const l1Provider = new ethers.providers.JsonRpcProvider(config.L1_PROVIDER_URL);
    const l2Provider = new ethers.providers.JsonRpcProvider(config.L2_PROVIDER_URL);
    const tokenShortList = readJsonFile(config.TOKEN_SHORT_LIST_PATH);
    const existingTokenList = readJsonFile(config.TOKEN_FULL_LIST_PATH);

    const tokenService = new TokenService(l1Provider, l2Provider, existingTokenList);
    await tokenService.processTokenEvents();
    tokenService.concatTokenShortList(tokenShortList);
    tokenService.exportTokenList();

    logger.info('Sync mainnet fulllist succesfully executed');
  } catch (error) {
    logger.error(`Error in main: ${error}`);
    throw error;
  }
}

// Execute the script
main();
