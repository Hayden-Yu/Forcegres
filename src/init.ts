import { PostgresDBService } from "./core/service/postgres-db.service";
import { ForceSchemaService } from "./core/service/force-schema.service";
import { DescribeGlobalSObjectResult } from "jsforce";
import { logger } from "./config/logger";

export async function init() {
  return await PostgresDBService
  .initializeSchema()
  .then(() => ForceSchemaService.listObjects())
  .then((sobjects: DescribeGlobalSObjectResult[]) => PostgresDBService.loadSobjects(sobjects))
  .catch(logger.error.bind(logger));
}