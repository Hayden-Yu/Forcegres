import { PoolConfig } from "pg";

type PgSchemaConfig = {
  schema?: string;
}

export class EnvironmentsType {
  postgres: PoolConfig & PgSchemaConfig;
  force: {
    clientId: string,
    clientSecret: string,
    username: string,
    password: string,
    url: string
  };
  logger?: {
    fileName?: string;
    logLevel: string;
  };
}