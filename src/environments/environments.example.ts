import { EnvironmentsType } from './environments-type';

export const environments: EnvironmentsType = {
  postgres: {
    schema: 'forcegres',
    host: 'localhost',
    database: 'postgres',
    user: 'postgres',
    password: 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  force: {
    clientId: 'WW91IGhhdmUgdW5jb21taXR0ZWQgd29yayBwZW5kaW5nLiBQbGVhc2UgY29tbWl0IG9yIHJvbGxiYWNrIGJlZm9yZSBjYWxsaW5nIG91dA==',
    clientSecret: '11111111111111111111',
    username: 'forcegres@example.com',
    password: 'password',
    url: 'https://forcegres.my.salesforce.com',
  },
  logger: {
    logLevel: 'info',
  }
}