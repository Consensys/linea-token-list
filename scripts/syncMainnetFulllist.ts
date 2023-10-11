import 'module-alias/register';
import { ethers } from 'ethers';
import { config } from 'src/config';
import { logger } from 'src/logger';
import { readJsonFile } from 'src/utils/file';
import { TokenService } from 'src/services/token.service';

async function main() {
  try {
    logger.info('Starting sync mainnet fulllist');
    const provider = new ethers.providers.JsonRpcProvider(config.PROVIDER_URL);
    const lineaProvider = new ethers.providers.JsonRpcProvider(config.LINEA_PROVIDER_URL);
    const tokenShortList = readJsonFile(config.TOKEN_SHORT_LIST_PATH);
    const existingTokenList = readJsonFile(config.TOKEN_LIST_PATH);

    const tokenService = new TokenService(provider, lineaProvider, existingTokenList);
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
