import { database, SCHEMA } from '../../config/database';
import { DescribeGlobalSObjectResult, DescribeSObjectResult, Field } from 'jsforce';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { logger } from '../../config/logger';

export class PostgresDBService {
  public static initializeSchema() {
    const schema = readFileSync(resolve(__dirname, '../../../resources/schema.psql'), 'utf-8').replace(/__SCHEMA__/g, SCHEMA);
    const data = readFileSync(resolve(__dirname, '../../../resources/data.psql'), 'utf-8').replace(/__SCHEMA__/g, SCHEMA);
    return database.query(schema+data);
  }

  public static async loadSobjects(schema: DescribeGlobalSObjectResult[]) {
    const client = await database.connect();
    try {
      const query = schema.reduce((qry, el) => {
        return qry + 
        `INSERT INTO ${SCHEMA}.internal_sobjects 
        (objectname,label,labelplural,layoutable,mergeable,mruenabled,queryable,
          replicateable,retrieveable,searchable,triggerable,undeletable,updateable,
          activateable,createable,custom,customsetting,deletable,deprecatedandhidden,
          feedenabled,hassubtypes,issubtype,keyprefix,enablesync)
          VALUES ('${el.name}','${el.label}','${el.labelPlural}',${el.layoutable},${el.mergeable},
          ${el.mruEnabled},${el.queryable},${el.replicateable},${el.retrieveable},${el.searchable},${el.triggerable},
          ${el.undeletable},${el.updateable},${el.activateable},${el.createable},${el.custom},
          ${el.customSetting},${el.deletable},${el.deprecatedAndHidden},${el.feedEnabled},
          ${el.hasSubtypes},${el.isSubtype},${el.keyPrefix === null ? null : `'${el.keyPrefix}'`},false)
          ON CONFLICT (objectname) DO
          UPDATE SET objectname = '${el.name}',
              label = '${el.label}',
              labelplural = '${el.labelPlural}',
              layoutable = ${el.layoutable},
              mergeable = ${el.mergeable},
              mruenabled = ${el.mruEnabled},
              queryable = ${el.queryable},
              replicateable = ${el.replicateable},
              retrieveable = ${el.retrieveable},
              searchable = ${el.searchable},
              triggerable = ${el.triggerable},
              undeletable = ${el.undeletable},
              updateable = ${el.updateable},
              activateable = ${el.activateable},
              createable = ${el.createable},
              custom = ${el.custom},
              customsetting = ${el.customSetting},
              deletable = ${el.deletable},
              deprecatedandhidden = ${el.deprecatedAndHidden},
              feedenabled = ${el.feedEnabled},
              hassubtypes = ${el.hasSubtypes},
              issubtype = ${el.isSubtype},
              keyprefix = ${el.keyPrefix === null ? null : `'${el.keyPrefix}'`};
        `.replace(/\s+/g, ' ');
      }, '');
      await new Promise((resolve, reject) => 
        client.query(query, (err, res) => {
          if (err) {
            logger.debug(query);
            logger.error(err);
            return reject(err);
          }
          return resolve(res);
        }));
      return client.release();
    } catch (error) {
      client.release();
      throw error;
    }
  }

  public static createSobjectTable(schema: DescribeSObjectResult) {
    const fieldList: string[] = [];
    schema.fields.forEach(field => 
      fieldList.push(`${field.name} ${soapToPostgresTypeMapping.get(field.soapType)}`));
      return database.query(`CREATE TABLE IF NOT EXISTS ${SCHEMA}.${schema.name} 
      (${fieldList.join(',')},PRIMARY KEY (Id));`);
  }

  public static async loadData(records: any[], schema: DescribeSObjectResult) {
      if (!records || !records.length) {
        return Promise.resolve();
      }
      const columns = await this.findExistingColumns(schema.name);
      const fields = schema.fields.filter(field => columns.indexOf(field.name.toLowerCase()) != -1);
      const insert = `INSERT INTO ${SCHEMA}.${schema.name} (${fields.map(f => f.name).join(',')}) VALUES `;
      const query = records.reduce((sql, record) => sql + `${insert} (${fields.map(field => getRecordSqlValue(record, field)).join(',')})
        ON CONFLICT(Id) DO 
        UPDATE SET ${fields.filter(f=>f.name!=='Id').map(f=> `${f.name}=${getRecordSqlValue(record, f)}`).join(',')};`.replace(/\s+/g, ' '), '');
        return new Promise((resolve, reject) => database.query(query, (err, res) => {
            if (err) {
              logger.debug(query);
              logger.error(err);
              return reject(err);
            }
            return resolve(res);
          }));
  }

  private static findExistingColumns(name: string) {
    return database.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='${SCHEMA}' AND table_name='${name.toLowerCase()}';`)
      .then(result => {
        logger.debug(`found ${result.rows.length} columns on table ${name}`);
        return result.rows.map(el => el['column_name']);
      });
  }
}

function getRecordSqlValue(record: any, field: Field) {
  let value = record[field.name];
  if (value === undefined || value === null) {
    return 'null';
  }
  if (field.soapType === 'tns:ID') {
    return `'${value.substring(0, 15)}'`;
  }
  const sqlType = soapToPostgresTypeMapping.get(field.soapType) || 'TEXT';
  if (sqlType === 'TEXT' 
    || sqlType === 'DATE' 
    || sqlType === 'TIMESTAMP'
    || sqlType.indexOf('CHAR') !== -1) {
      if (typeof value === 'object') { 
        // some fields returns JSON but decribe as string e.g. Account.ShippingAddress
        value = JSON.stringify(value);
      }
      return `'${`${value}`.replace(/'/g, '\'\'')}'`
  }
  return value;
}

const soapToPostgresTypeMapping = new Map([
  ['tns:ID', 'TEXT'],
  ['xsd:anyType', 'TEXT'],
  ['xsd:base64Binary', 'TEXT'], // provided as url path in soql
  ['xsd:boolean', 'BOOLEAN'],
  ['xsd:date', 'DATE'],
  ['xsd:dateTime', 'TIMESTAMP'],
  ['xsd:double', 'FLOAT'],
  ['xsd:int', 'INTEGER'],
  ['xsd:string', 'TEXT'],
  // the following are not found in official documentation, but still occur when describing an sobject
  ['xsd:time', 'TIME'],
  ['urn:address', 'TEXT'],
  ['urn:JunctionIdListNames', 'TEXT'],
  ['urn:location', 'TEXT'],
  ['urn:RecordTypesSupported', 'TEXT'],
  ['urn:RelationshipReferenceTo', 'TEXT'],
  ['urn:SearchLayoutButtonsDisplayed', 'TEXT'],
  ['urn:SearchLayoutFieldsDisplayed', 'TEXT'],
])