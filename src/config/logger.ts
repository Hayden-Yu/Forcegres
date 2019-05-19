import { transports, createLogger } from 'winston';
import { environments } from '../environments/environments';

const config = {
  level: (environments.logger && environments.logger.logLevel) ? environments.logger.logLevel: 'info',
  transports: [] as any[],
};

if (environments.logger && environments.logger.fileName) {
  config.transports.push(new transports.File({filename: environments.logger.fileName}));
} else {
  config.transports.push(new transports.Console());
}

export const logger = createLogger(config);
