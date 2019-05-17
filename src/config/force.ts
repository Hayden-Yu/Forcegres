import { Connection } from 'jsforce';
import { environments } from '../environments/environments';
import { logger } from './logger';

export const force = new Connection({
  clientId: environments.force.clientId,
  clientSecret: environments.force.clientSecret,
  loginUrl: environments.force.url,
})

export const login = () => 
  new Promise((resolve, reject) => {
    force.login(environments.force.username, environments.force.password, (err, info) => {
      if (err) {
        logger.error(`salesforce login error: ${err}`);
        return reject(err);
      }
      logger.info(`salesforce user ${info.id} authenticated`);
      resolve(force);
    });
  });