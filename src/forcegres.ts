import { logger } from "./config/logger";
import { initalizeDatabase, loadSobjects } from './core/synchronize-database';
import { cycle } from './core/cycle';

export async function init() {
  try {
    await initalizeDatabase();
    await loadSobjects();
  } catch (err) {
    logger.error(err);
  }
}

export function exec(): Promise<void> {
  return cycle().then(()=>exec())
}
