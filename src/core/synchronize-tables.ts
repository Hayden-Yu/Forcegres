import moment from 'moment-timezone';
import { database, SCHEMA } from "../config/database";
import { PostgresDBService } from "./service/postgres-db.service";
import { ForceSchemaService } from "./service/force-schema.service";
import { QueryResult, DescribeSObjectResult } from "jsforce";
import { ForceDataService } from "./service/force-data.service";
import { logger } from "../config/logger";

const SOQL_WHERE_IN_SIZE = 600;

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

async function massDeleteRecords(name: string, ids: string[]) {
  const connection = await database.connect();
  try {
    await connection.query(`CREATE TEMPORARY TABLE temp_delete_${name} (Id TEXT PRIMARY KEY);`);
    await connection.query(`INSERT INTO temp_delete_${name} (Id) VALUES (${ids.map(id=>`'${id.substring(0,15)}'`).join(',')})`);
    await connection.query(`DELETE FROM ${SCHEMA}.${name} USING temp_delete_${name} WHERE ${name}.Id = temp_delete_${name}.Id`);
    await connection.query(`DROP TABLE temp_delete_${name}`);
  } catch(err) {
    logger.error(err);
  }
  connection.release();
}

async function synchronizeTable(name: string) {
  const schema = await ForceSchemaService.describeObject(name);
  const currentTime = (new Date()).toISOString();
  const syncHistory = await database.query(`SELECT id, ts FROM ${SCHEMA}.internal_syncHistory WHERE objectName='${name}' ORDER BY id DESC;`);
  const soql = ForceSchemaService.generateSelectStar(schema);
  const processes: Promise<any>[] = [
    database.query(`INSERT INTO ${SCHEMA}.internal_syncHistory (objectName, ts) VALUES ('${name}','${currentTime}');`),
  ];
  if (!syncHistory.rows.length) {
    logger.info(`initialize postgres table ${name}`);
    PostgresDBService.createSobjectTable(schema);
    processes.push(synchronizeTableWithPagination(await ForceDataService.query(soql), schema));
  } else {
    const lastSync = moment.tz(syncHistory.rows[0]['ts'], 'UTC').toISOString();
    let recentUpdates = await ForceDataService.getRecentUpdates(name, lastSync, currentTime);
    logger.info(`found ${recentUpdates.length} recent updates on ${name}`);
    while(recentUpdates.length) {
      const chunk = recentUpdates.slice(0,SOQL_WHERE_IN_SIZE);
      processes.push(
        synchronizeTableWithPagination(
          await ForceDataService.query(`${soql} WHERE Id IN (${chunk.map(id=>`'${id}'`).join(',')})`),
          schema));
      logger.info(`synchronized ${chunk.length} updated ${name} records`);
      recentUpdates = recentUpdates.slice(SOQL_WHERE_IN_SIZE);
    }
    let recentDeletes = await ForceDataService.getRecentDeletes(name, lastSync, currentTime);
    logger.info(`found ${recentUpdates.length} recent deletes on ${name}`);
    if (recentDeletes.length) {
      processes.push(massDeleteRecords(name, recentDeletes));
    }
    await Promise.all(processes);
  }
}

export function synchronizeTables(): Promise<any> {
  return database.query(`SELECT objectname FROM ${SCHEMA}.internal_sobjects WHERE enableSync=true`)
    .then(result => Promise.all(result.rows.map(row=>synchronizeTable(row['objectname']))));
}