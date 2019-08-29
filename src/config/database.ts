import { Postgres } from '../lib/database/postgres';
import { logger } from './logger';
import { environments } from './environments';


export const database = new Postgres(environments.postgres, logger);

export const SCHEMA = environments.postgres.schema;