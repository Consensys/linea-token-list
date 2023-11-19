import { configSchema } from 'src/config/config.schema';
import { logger } from 'src/logger';
import { Config } from 'src/models/config';

/**
 * Validate the config object
 * @param config
 */
export const validateConfig = (config: Config): void => {
  const { error } = configSchema.validate(config);
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  } else {
    logger.info('Config validation success');
  }
};
