import { createLogger, format, transports } from 'winston';
import { name } from 'root/package.json';

const isDevMode = process.env.NODE_ENV === 'development';

/**
 * Winston logger instance
 */
const logger = createLogger({
  level: 'info',
  format: format.combine(format.colorize(), format.timestamp(), format.json()),
  defaultMeta: { service: name },
  transports: [
    new transports.Console({
      format: isDevMode ? format.combine(format.colorize(), format.simple()) : format.json(),
    }),
  ],
});

export { logger };
