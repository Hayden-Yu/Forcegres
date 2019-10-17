import moment from 'moment-timezone';
import { database as db, SCHEMA } from "../config/database";
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { salesforce as sf } from '../config/salesforce';
import * as translateQry from './translate-query';
import { DescribeSObjectResult } from 'jsforce';
import { logger } from "../config/logger";
import { Query, Connection } from '../lib/database/postgres';

const SOQL_SIZE = 14000;
const MIN_SYNC_WINDOW = 180; // minimun number of seconds between each syncrhonization on the same object
const WINDOW_OVERLAP = 90; // number of seconds overlap between each window when query Salesforce for updated records.

export function loadSobjectList() {
  return sf.sobject.listAll()
    .then(res=>db.query(translateQry.loadSobject(res.sobjects)));
}

export function initalizeDatabase() {
  const schema = readFileSync(resolve(__dirname, '../../resources/schema.psql'), 'utf-8').replace(/__SCHEMA__/g, SCHEMA);
  const data = readFileSync(resolve(__dirname, '../../resources/data.psql'), 'utf-8').replace(/__SCHEMA__/g, SCHEMA);
  return db.query(schema+data);
}

export async function synchronizeSobject(name: string) {
  const lastSync = await findLastSyncDate(name, db.query.bind(db));
  if (!lastSync) {
    return loadScratch(name);
  } else {
    const timeDiffSinceLastSync = -moment(lastSync).diff(Date(), 'seconds');
    if (MIN_SYNC_WINDOW > timeDiffSinceLastSync) {
      logger.silly(`wait ${MIN_SYNC_WINDOW-timeDiffSinceLastSync}s before next sync`);
      await wait((MIN_SYNC_WINDOW-timeDiffSinceLastSync) * 1000);
    }
    return loadIncremental(name, lastSync);
  }
}

export async function loadScratch(name: string) {
  const date = (new Date()).toISOString();
  const schema = await sf.sobject.describe(name);

  return db.transact(async conn => {
    logger.info(`initialize postgres table ${schema.name}`);
    await conn.query(translateQry.createSobjectTable(schema));

    const fields = await findExistingColumns(schema.name, conn.query.bind(conn));
    schema.fields = schema.fields.filter(f => fields.indexOf(f.name.toLowerCase()) !== -1);
    await conn.query(translateQry.logSyncHistory(name, date));
    const init = await sf.soql.query(await sf.sobject.selectStar(name, undefined, schema.fields));
    await Promise.all([loadChunkData(schema, init.records, conn.query.bind(conn)), loadDataFollowUp(schema, init.nextRecordsUrl, conn.query.bind(conn))])
    await conn.query(translateQry.closeSyncHistory(name, date));
  });
}

export async function loadIncremental(name: string, start?: string) {
  const end = (new Date()).toISOString();

  return db.transact(async conn => {
    logger.debug(`Query recent updates on ${name}`);
    start = start || await findLastSyncDate(name, conn.query.bind(conn));
    await conn.query(translateQry.logSyncHistory(name, end, start));
    await loadUpdates(name, start, end, conn);
    await loadDeletes(name, start, end, conn);
    await conn.query(translateQry.closeSyncHistory(name, end));
  })
}

export function listTables(): Promise<string[]> {
  return db.query(translateQry.listTables()).then(res => res.rows.map(r=>r.objectname));
}

async function loadUpdates(name: string, start: string, end: string, conn: Connection) {
  const changes = await sf.sobject.recentUpdted(name, moment(start).subtract(WINDOW_OVERLAP, 's').toISOString(), end);
  if (!changes.ids || !changes.ids.length) {
    return;
  }
  
  const schema = await sf.sobject.describe(name);
  const fields = await findExistingColumns(schema.name, conn.query.bind(conn));
  schema.fields = schema.fields.filter(f => fields.indexOf(f.name.toLowerCase()) !== -1);
 
  const soql = await sf.sobject.selectStar(schema.name, undefined, schema.fields);
  logger.info(`Found ${changes.ids.length} updates on ${schema.name}`);
  const chunkSize = Math.floor((SOQL_SIZE-(encodeURI(soql).length+24))/25);
  await loadUpdatesByChunk(soql, schema, changes.ids, chunkSize, [], conn);
  logger.info(`Finished synchronizing [${schema.name}]`);
}

function loadUpdatesByChunk(soql: string, schema: DescribeSObjectResult, pending: string[], chunkSize: number, acc: Promise<void>[], conn: Connection): Promise<void>[] {
  if (!pending.length) {
    return acc;
  }
  const query = `${soql} WHERE Id IN (${pending.slice(0,chunkSize).map(id=>`'${id.substring(0,15)}'`).join(',')})`
  acc.push(sf.soql.query(query).then(res => {
    return Promise.all([loadChunkData(schema, res.records, conn.query.bind(conn)), loadDataFollowUp(schema, res.nextRecordsUrl, conn.query.bind(conn))]) as Promise<any>
  }))
  return loadUpdatesByChunk(soql, schema, pending.slice(chunkSize), chunkSize, acc, conn);
}

async function loadDeletes(name: string, start: string, end: string, conn: Connection) {
  const deletes = await sf.sobject.recentDeleted(name, moment(start).subtract(WINDOW_OVERLAP, 's').toISOString(), end);
  if (!deletes.deletedRecords || !deletes.deletedRecords.length) {
    return;
  }
  logger.info(`Found ${deletes.deletedRecords.length} deletes on ${name}`);
  await conn.query(translateQry.deleteRecords(name, deletes.deletedRecords));
  logger.debug(`deleted ${deletes.deletedRecords.length} records from ${name}`);
  return;
}

async function loadDataFollowUp(schema: DescribeSObjectResult, locator: string | undefined, query: Query): Promise<void> {
  if (!locator) {
    return;
  }
  logger.info(`soql pagination retriving next page of ${schema.name}`)
  const r = await sf.soql.queryMore(locator);
  return Promise.all([loadChunkData(schema, r.records, query),
    loadDataFollowUp(schema, r.nextRecordsUrl, query)]) as Promise<any>;
}

async function loadChunkData(schema: DescribeSObjectResult, records: any[], query: Query): Promise<void> {
  await query(translateQry.loadData(records, schema));
  logger.info(`synchronized ${records.length} ${schema.name} records`);
}

function findLastSyncDate(name: string, query: Query): Promise<string> {
  return query(translateQry.loadLastSync(name))
    .then(res => res.rows[0] && res.rows[0].enddate ? moment.tz(res.rows[0].enddate, 'UTC').toISOString() : '');
}

function findExistingColumns(name: string, query: Query) {
  return query(translateQry.findExistingColumns(name))
    .then(res => res.rows.map(el => el['column_name']));
}

function wait(millisec: number) {
  return new Promise((resolve) => setTimeout(resolve, millisec))
}