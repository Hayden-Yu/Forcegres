import { logger } from "./config/logger";
import { initalizeDatabase, loadSobjects } from './core/synchronize-database';

export async function init() {
  try {
    await initalizeDatabase();
    await loadSobjects();
  } catch (err) {
    logger.error(err);
  }
}