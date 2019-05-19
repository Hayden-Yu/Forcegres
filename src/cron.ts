import { synchronizeTables } from "./core/synchronize-tables";
import { logger } from "./config/logger";

export function cron() {
  return synchronizeTables()
    .then(() => logger.info('synchronization finished'))
    .catch(logger.error.bind(logger));
}