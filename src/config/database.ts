import { Pool } from 'pg';
import { logger } from './logger';
import { environments } from '../environments/environments';

export const database = new Pool(environments.postgres);

database.on('error', (err, client) => {
  logger.error(`pg error ${err.message}`);
});

database.on('acquire', (client) => {
  logger.silly(`pg connection used by ${client}`);
});

export const SCHEMA = 'force';