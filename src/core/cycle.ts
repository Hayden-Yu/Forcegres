import { listTables, loadChange } from "./synchronize-database";
import { logger } from '../config/logger';
import { salesforce } from '../config/salesforce';

const WAIT_TIME = 6000

export function cycle() {
  return listTables()
  .then(list => list.reduce((promise, name) => promise.then(() => Promise.all([loadChange(name), wait(WAIT_TIME)]) as any), Promise.resolve()))
  .then(() => logger.info(`API Usage: ${salesforce.client.limitInfo}`))
}

function wait(millisec: number) {
  return new Promise((resolve) => setTimeout(resolve, millisec))
}
