import 'module-alias/register';
import { config } from 'src/config';
import { logger } from 'src/logger';
import { TokenService } from 'src/services/token.service';
import { createClients } from 'src/utils/provider';

async function main() {
  try {
    logger.info('Starting check mainnet shortlist');

    // Create clients with fallback chain (env vars > public endpoints)
    const { l1Client, l2Client } = await createClients(config.L1_PROVIDER_URL, config.L2_PROVIDER_URL);

    const tokenService = new TokenService(l1Client, l2Client);
    await tokenService.verifyList(config.TOKEN_SHORT_LIST_PATH);

    logger.info('Check mainnet shortlist successfully executed');
  } catch (error) {
    logger.error(`Error in main: ${error}`);
    throw error;
  }
}

// Execute the script
main();
