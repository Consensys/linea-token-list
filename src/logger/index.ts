import { createLogger, format, transports } from 'winston';
import { name } from 'root/package.json';

const isDevMode = process.env.NODE_ENV === 'development';

const customFormat = format.printf(({ level, message, timestamp, service, ...metadata }) => {
  const metaString = Object.keys(metadata).length ? JSON.stringify(metadata, null) : '';
  return `${level} ${timestamp} (${service}): ${message}${metaString ? `\n\t${metaString}` : ''}`;
});

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.colorize(),
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    isDevMode ? customFormat : format.json()
  ),
  defaultMeta: { service: name },
  transports: [
    new transports.Console({
      format: isDevMode ? format.combine(format.colorize(), customFormat) : format.json(),
    }),
  ],
});

export { logger };
