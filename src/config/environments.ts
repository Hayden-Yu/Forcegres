import { resolve } from 'path';
import { config } from 'dotenv';
config({path: resolve(__dirname, '../../../.env')})

export const environments = {
  postgres: {
    schema: process.env.POSTGRES_SCHEMA || 'forcegres',
    host: <string>process.env.POSTGRES_HOST,
    database: <string>process.env.POSTGRES_DATABASE,
    user: <string>process.env.POSTGRES_USER,
    password: <string>process.env.POSTGRES_PASSWORD,
    max: Number(process.env.POSTGRES_MAX_CONNECTION) || 20,
    idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECTION_TIMEOUT) || 2000,
  },
  force: {
    clientId: <string>process.env.FORCE_CLIENTID,
    clientSecret: <string>process.env.FORCE_CLIENTSECRET,
    username: <string>process.env.FORCE_USERNAME,
    password: <string>process.env.FORCE_PASSWORD,
    securityToken: process.env.FORCE_SECURITY_TOKEN || '',
    url: process.env.FORCE_LOGIN_URL,
  },
  logger: {
    logLevel: process.env.LOG_LEVEL || 'info',
    fileName: process.env.LOG_FILENAME
  }
}