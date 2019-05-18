import { PostgresSchemaService } from "./core/service/postgres-schema.service";
import { ForceSchemaService } from "./core/service/force-schema.service";
import { DescribeGlobalSObjectResult } from "jsforce";
import { logger } from "./config/logger";

export async function initializeDB() {
  return await PostgresSchemaService
  .initializeSchema()
  .then(() => ForceSchemaService.listObjects())
  .then((sobjects: DescribeGlobalSObjectResult[]) => PostgresSchemaService.loadSobjects(sobjects))
  .catch(logger.error.bind(logger));
}