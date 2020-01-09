import { resolve } from 'path';
import { config } from 'dotenv';
config({path: resolve(__dirname, '../../../.env')});

export const environments = {
  postgres: {
    schema: process.env.POSTGRES_SCHEMA || 'forcegres',
    host: process.env.POSTGRES_HOST as string,
    database: process.env.POSTGRES_DATABASE as string,
    user: process.env.POSTGRES_USER as string,
    password: process.env.POSTGRES_PASSWORD as string,
    max: Number(process.env.POSTGRES_MAX_CONNECTION) || 20,
    idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT) || 0,
    connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECTION_TIMEOUT) || 0,
  },
  force: {
    clientId: process.env.FORCE_CLIENTID as string,
    clientSecret: process.env.FORCE_CLIENTSECRET as string,
    username: process.env.FORCE_USERNAME as string,
    password: process.env.FORCE_PASSWORD as string,
    securityToken: process.env.FORCE_SECURITY_TOKEN || '',
    url: process.env.FORCE_LOGIN_URL,
  },
  logger: {
    logLevel: process.env.LOG_LEVEL || 'info',
    fileName: process.env.LOG_FILENAME,
  },
  minSyncWindow: Number(process.env.MIN_SYNC_WINDOW) || 900,
};
