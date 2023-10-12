import 'module-alias/register';
import { ethers } from 'ethers';
import { config } from 'src/config';
import { logger } from 'src/logger';
import { readJsonFile } from 'src/utils/file';
import { TokenService } from 'src/services/token.service';
import { configSchema } from 'src/config/config.schema';
import { validateConfig } from 'src/utils/validation';

async function main() {
  try {
    logger.info('Starting check mainnet shortlist');
    validateConfig(config);

    const tokenShortList = readJsonFile(config.TOKEN_SHORT_LIST_PATH);

    logger.info('Check mainnet shortlist succesfully executed');
  } catch (error) {
    logger.error(`Error in main: ${error}`);
    throw error;
  }
}

// Execute the script
main();
