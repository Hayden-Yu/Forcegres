import { logger } from "./config/logger";
import { initalizeDatabase, loadSobjectList } from './core/synchronize-database';
import { cycle } from './core/cycle';

export async function init() {
  try {
    await initalizeDatabase();
    await loadSobjectList();
  } catch (err) {
    logger.error(err);
  }
}

export function exec(): Promise<void> {
  return cycle().then(exec)
}
