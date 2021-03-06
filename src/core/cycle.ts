import { listTables, synchronizeSobject } from './synchronize-database';
import { logger } from '../config/logger';
import { salesforce } from '../config/salesforce';

const WAIT_TIME = 6000;

export function cycle() {
  return listTables()
  .then(list => list.reduce((promise, name) => promise.then(() => synchronizeSobject(name)), Promise.resolve()))
  .then(() => logger.info(`API Usage: ${salesforce.client.limitInfo}`));
}
