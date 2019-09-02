import moment from 'moment-timezone';
import { database as db, SCHEMA } from "../config/database";
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { salesforce as sf } from '../config/salesforce';
import * as translateQry from './translate-query';
import { DescribeSObjectResult } from 'jsforce';
import { logger } from "../config/logger";

const SOQL_SIZE = 14000;

export function initalizeDatabase() {
  const schema = readFileSync(resolve(__dirname, '../../resources/schema.psql'), 'utf-8').replace(/__SCHEMA__/g, SCHEMA);
  const data = readFileSync(resolve(__dirname, '../../resources/data.psql'), 'utf-8').replace(/__SCHEMA__/g, SCHEMA);
  return db.query(schema+data);
}

export function loadSobjects() {
  return sf.sobject.listAll()
    .then(res=>db.query(translateQry.loadSobject(res.sobjects)));
}

export async function loadChange(name: string) {
  const lastSync = await findLastSyncDate(name);
  return lastSync ? loadIncremental(name, lastSync) : loadScratch(name);
}

export async function loadScratch(name: string) {
  const date = (new Date()).toISOString();
  const schema = await sf.sobject.describe(name);
  logger.info(`initialize postgres table ${schema.name}`);
  await db.query(translateQry.createSobjectTable(schema));

  const fields = await findExistingColumns(schema.name);
  schema.fields = schema.fields.filter(f => fields.indexOf(f.name.toLowerCase()) !== -1);
  await db.query(translateQry.logSyncHistory(name, date));
  const init = await sf.soql.query(await sf.sobject.selectStar(name, undefined, schema.fields));
  await Promise.all([loadChunkData(schema, init.records), loadDataFollowUp(schema, init.nextRecordsUrl)])
  await db.query(translateQry.closeSyncHistory(name, date));
}

export async function loadIncremental(name: string, start?: string) {
  const end = (new Date()).toISOString();
  start = start || await findLastSyncDate(name);
  await db.query(translateQry.logSyncHistory(name, end, start));
  await loadUpdates(name, start, end);
  await loadDeletes(name, start, end);
  await db.query(translateQry.closeSyncHistory(name, end));
}

export function listTables(): Promise<string[]> {
  return db.query(translateQry.listTables()).then(res => res.rows.map(r=>r.objectname));
}

async function loadUpdates(name: string, start: string, end: string) {
  const changes = await sf.sobject.recentUpdted(name, start, end);
  if (!changes.ids || !changes.ids.length) {
    return;
  }
  
  const schema = await sf.sobject.describe(name);
  const fields = await findExistingColumns(schema.name);
  schema.fields = schema.fields.filter(f => fields.indexOf(f.name.toLowerCase()) !== -1);
 
  const soql = await sf.sobject.selectStar(schema.name, undefined, schema.fields);
  logger.info(`Found ${changes.ids.length} updates on ${schema.name}`);
  const chunkSize = Math.floor((SOQL_SIZE-(encodeURI(soql).length+24))/25);
  await loadUpdatesByChunk(soql, schema, changes.ids, chunkSize, []);
  logger.info(`Finished synchronizing [${schema.name}]`);
}

function loadUpdatesByChunk(soql: string, schema: DescribeSObjectResult, pending: string[], chunkSize: number, acc: Promise<void>[]): Promise<void>[] {
  if (!pending.length) {
    return acc;
  }
  const query = `${soql} WHERE Id IN (${pending.slice(0,chunkSize).map(id=>`'${id.substring(0,15)}'`).join(',')})`
  acc.push(sf.soql.query(query).then(res => {
    return Promise.all([loadChunkData(schema, res.records), loadDataFollowUp(schema, res.nextRecordsUrl)]) as Promise<any>
  }))
  return loadUpdatesByChunk(soql, schema, pending.slice(chunkSize), chunkSize, acc);
}

async function loadDeletes(name: string, start: string, end: string) {
  const deletes = await sf.sobject.recentDeleted(name, start, end);
  if (!deletes.deletedRecords || !deletes.deletedRecords.length) {
    return;
  }
  logger.info(`Found ${deletes.deletedRecords.length} updates on ${name}`);
  await db.query(translateQry.deleteRecords(name, deletes.deletedRecords));
  logger.debug(`deleted ${deletes.deletedRecords.length} records from ${name}`);
  return;
}

async function loadDataFollowUp(schema: DescribeSObjectResult, locator: string | undefined): Promise<void> {
  if (!locator) {
    return;
  }
  logger.info(`soql pagination retriving next page of ${schema.name}`)
  const r = await sf.soql.queryMore(locator);
  return Promise.all([loadChunkData(schema, r.records),
    loadDataFollowUp(schema, r.nextRecordsUrl)]) as Promise<any>;
}

async function loadChunkData(schema: DescribeSObjectResult, records: any[]): Promise<void> {
  await db.query(translateQry.loadData(records, schema));
  logger.info(`synchronized ${records.length} ${schema.name} records`);
}

function findLastSyncDate(name: string): Promise<string> {
  return db.query(translateQry.loadLastSync(name))
    .then(res => res.rows[0] && res.rows[0].enddate ? moment.tz(res.rows[0].enddate, 'UTC').toISOString() : '');
}

function findExistingColumns(name: string) {
  return db.query(translateQry.findExistingColumns(name))
    .then(res => res.rows.map(el => el['column_name']));
}
