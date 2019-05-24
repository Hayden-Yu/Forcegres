import moment from 'moment-timezone';
import { database, SCHEMA } from "../config/database";
import { PostgresDBService } from "./service/postgres-db.service";
import { ForceSchemaService } from "./service/force-schema.service";
import { QueryResult, DescribeSObjectResult } from "jsforce";
import { ForceDataService } from "./service/force-data.service";
import { logger } from "../config/logger";

// fun fact: soql HTTP 414 happen with about 15000 chars, but got 431 once with 12000 chars while testing limit
const SOQL_WHERE_IN_SIZE = 500;

function synchronizeTableWithPagination(queryResult: QueryResult<any>, schema: DescribeSObjectResult): Promise<any> {
  const processes = [];
  if (queryResult.nextRecordsUrl) {
    logger.info(`soql pagination retriving next page of ${schema.name}`)
    processes.push(
      ForceDataService.queryNext(queryResult).then(res => synchronizeTableWithPagination(res, schema)))
  }
  processes.push(
    PostgresDBService.loadData(queryResult.records, schema)
      .then(()=>logger.info(`loading sobject [${schema.name}] ${queryResult.records.length} records into db`)));
  return Promise.all(processes);
}

async function loadFromScratch(schema: DescribeSObjectResult) {
  logger.info(`initialize postgres table ${schema.name}`);
  await PostgresDBService.createSobjectTable(schema);
  const soql = ForceSchemaService.generateSelectStar(schema);
  return synchronizeTableWithPagination(await ForceDataService.query(soql), schema);
}

async function updateTable(schema: DescribeSObjectResult, lastSync: string, currentTime: string) {
  const processes = [];
  let recentUpdates = await ForceDataService.getRecentUpdates(schema.name, lastSync, currentTime);
  const soql = ForceSchemaService.generateSelectStar(schema);
  while(recentUpdates.length) {
    const chunk = recentUpdates.slice(0,SOQL_WHERE_IN_SIZE);
    processes.push(
      synchronizeTableWithPagination(
        await ForceDataService.query(`${soql} WHERE Id IN (${chunk.map(id=>`'${id.substring(0,15)}'`).join(',')})`),
        schema));
    logger.info(`synchronized ${chunk.length} updated ${schema.name} records`);
    recentUpdates = recentUpdates.slice(SOQL_WHERE_IN_SIZE);
  }
  let recentDeletes = await ForceDataService.getRecentDeletes(schema.name, lastSync, currentTime);
  if (recentDeletes.length) {
    processes.push(PostgresDBService.deleteRecords(schema.name, recentDeletes.map(id=>id.substring(0,15))));
  }
  return processes;
}

export async function synchronizeTable(name: string, refresh?: boolean) {
  const currentTime = (new Date()).toISOString();
  const syncHistory = await database.query(`SELECT id, ts FROM ${SCHEMA}.internal_syncHistory WHERE objectName='${name}' ORDER BY id DESC LIMIT 1;`);
  const schema = await ForceSchemaService.describeObject(name);
  
  const processes: Promise<any>[] = [
    database.query(`INSERT INTO ${SCHEMA}.internal_syncHistory (objectName, ts) VALUES ('${name}','${currentTime}');`),
  ];
  if (!syncHistory.rows.length || refresh) {
    processes.push(loadFromScratch(schema));
  } else {
    if (schema.replicateable) {
      const columns = await PostgresDBService.findExistingColumns(schema.name);
      schema.fields = schema.fields.filter(field => columns.indexOf(field.name.toLowerCase()) != -1);
      const lastSync = moment.tz(syncHistory.rows[0]['ts'], 'UTC');
      (await updateTable(schema, lastSync.subtract(2, 'minutes').toISOString(), currentTime))
          .forEach(el => processes.push(el));
    }
  }
  await Promise.all(processes);
}

export function synchronizeTables(): Promise<any> {
  return database.query(`SELECT objectname FROM ${SCHEMA}.internal_sobjects WHERE enableSync=true`)
    .then(result => Promise.all(result.rows.map(row=>synchronizeTable(row['objectname']))));
}