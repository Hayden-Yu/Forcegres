import { SCHEMA } from '../config/database';
import { DescribeGlobalSObjectResult, DescribeSObjectResult, Field, DeletedRecord } from 'jsforce';

export function loadSobject(schema: DescribeGlobalSObjectResult[]): string {
  return schema.reduce((qry, el) => {
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
}

export function createSobjectTable(schema: DescribeSObjectResult): string {
  const fieldList: string[] = [];
    schema.fields.forEach(field => 
      fieldList.push(`"${field.name.toLowerCase()}" ${soapToPostgresTypeMapping.get(field.soapType)}`));
      return `CREATE TABLE IF NOT EXISTS ${SCHEMA}."${schema.name.toLowerCase()}" 
      (${fieldList.join(',')},PRIMARY KEY (Id));`;
}

export function loadData(records: any[], schema: DescribeSObjectResult): string {
  if (!records || !records.length) {
    return '';
  }
  const fields = schema.fields;
  const insert = `INSERT INTO ${SCHEMA}."${schema.name.toLowerCase()}" (${fields.map(f => `"${f.name.toLowerCase()}"`).join(',')}) VALUES `;
  return records.reduce((sql, record) => sql + `${insert} (${fields.map(field => getRecordSqlValue(record, field)).join(',')})
    ON CONFLICT(Id) DO 
    UPDATE SET ${fields.filter(f=>f.name!=='Id').map(f=> `"${f.name.toLowerCase()}"=${getRecordSqlValue(record, f)}`).join(',')};`.replace(/\s+/g, ' '), '');
}

export function findExistingColumns(name: string): string {
  return `SELECT column_name FROM information_schema.columns WHERE table_schema='${SCHEMA}' AND table_name='${name.toLowerCase()}';`;
}

export function deleteRecords(name: string, deleted: DeletedRecord[]): string {
  const tmpTableName = `tmp_delete_${name}_${deleted[0].id}`
  return `CREATE TEMPORARY TABLE ${tmpTableName} (Id TEXT PRIMARY KEY);` +
    `INSERT INTO ${tmpTableName} (Id) VALUES ${deleted.map(d=>`('${d.id}')`).join(',')};` + 
    `DELETE FROM ${SCHEMA}."${name.toLowerCase()}" USING ${tmpTableName} WHERE "${name.toLowerCase()}".Id = ${tmpTableName}.Id;` +
    `DROP TABLE ${tmpTableName};`;
}

export function logSyncHistory(name: string, to: string, from?: string): string {
  return `INSERT INTO ${SCHEMA}.internal_syncHistory (objectName,fromdate,enddate,updates,deletes) VALUES ('${name}',${from?`'${from}'`:'null'},'${to}',0,0);`;
}

export function setUpdateDetail(objectName: string, endDate: string, updateCount?: number, deleteCount?: number) {
  if (!updateCount && !deleteCount) {
    return '';
  }
  return `UPDATE ${SCHEMA}.internal_syncHistory SET ` + 
    (updateCount ? `updates=${updateCount} ${deleteCount ? `, deletes=${deleteCount}` : ''}` : `deletes=${deleteCount} `) +
    `WHERE objectName='${objectName}' AND enddate='${endDate}'`;
}
// export function closeSyncHistory(name: string, to: string): string {
//   return `UPDATE ${SCHEMA}.internal_syncHistory SET finished=true WHERE objectName='${name}' AND enddate='${to}'`;
// }

export function loadSyncHistory(name: string): string {
  return `SELECT enddate, updates, deletes FROM ${SCHEMA}.internal_syncHistory WHERE objectName='${name}' AND enddate > now() at time zone 'utc'-interval '30 days - 1 hour' ORDER BY enddate DESC;`;
}

export function listTables(): string {
  return `SELECT objectname FROM ${SCHEMA}.internal_sobjects WHERE enablesync=true AND replicateable=true`;
}

function getRecordSqlValue(record: any, field: Field): string {
  let value = record[field.name];
  if (value === undefined || value === null) {
    return 'null';
  }
  if (field.soapType === 'tns:ID') {
    return `'${value.substring(0, 15)}'`;
  }
  const sqlType = soapToPostgresTypeMapping.get(field.soapType) || 'TEXT';

  if (value === '' && (
    sqlType === 'BOOLEAN' ||
    sqlType === 'DATE' ||
    sqlType === 'TIMESTAMP' ||
    sqlType === 'TIME' ||
    sqlType === 'FLOAT' ||
    sqlType === 'INTEGER')) { // empty value in csv file
      return 'null';
  }

  if (sqlType === 'TEXT' 
    || sqlType === 'DATE' 
    || sqlType === 'TIMESTAMP'
    || sqlType === 'TIME'
    || sqlType.indexOf('CHAR') !== -1) {
      if (typeof value === 'object') { 
        // Compound fields returns JSON but decribe as string e.g. Account.ShippingAddress
        value = JSON.stringify(value);
      }
      if (sqlType === 'TIME') {
        value = value.replace(/^(.*)Z$/, '$1');
      }
      if ((sqlType === 'TIME' || sqlType === 'TIMESTAMP')) {
        if (/^0000-.*/.test(value)) {
          value = '-infinity';
        } else if (/^9999-.*/.test(value)) {
          value = 'infinity';
        }
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