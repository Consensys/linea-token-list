import 'module-alias/register';
import { ethers } from 'ethers';
import { config } from 'src/config';
import { logger } from 'src/logger';
import { TokenService } from 'src/services/token.service';
import { validateConfig } from 'src/utils/validation';

async function main() {
  try {
    logger.info('Starting check mainnet shortlist');
    validateConfig(config);

    const l1Provider = new ethers.providers.JsonRpcProvider(config.L1_PROVIDER_URL);
    const l2Provider = new ethers.providers.JsonRpcProvider(config.L2_PROVIDER_URL);

    const tokenService = new TokenService(l1Provider, l2Provider);
    await tokenService.verifyList(config.TOKEN_SHORT_LIST_PATH);

    logger.info('Check mainnet shortlist successfully executed');
  } catch (error) {
    logger.error(`Error in main: ${error}`);
    throw error;
  }
}

// Execute the script
main();
