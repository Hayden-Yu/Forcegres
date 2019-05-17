import { transports, createLogger } from 'winston';

const config = {
  level: process.env.LOG_LEVEL || 'info',
  transports: new Array<any>(),
};

if (process.env.LOG_FILE) {
  config.transports.push(new transports.File({ filename: process.env.LOG_LEVEL }));
} else {
  config.transports.push(new transports.Console());
}

export const logger = createLogger(config);
