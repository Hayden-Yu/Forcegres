import { database, SCHEMA } from "./config/database";
import { synchronizeTable } from "./core/synchronize-tables";

export async function refreshTable(name: string) {
  const internalObj = await database.query(`SELECT objectname FROM ${SCHEMA}.internal_sobjects WHERE lower(objectname)='${name.toLowerCase()}';`);
  if (internalObj.rows.length) {
    const objName = internalObj.rows[0].objectname;
    await Promise.all([
      database.query(`UPDATE ${SCHEMA}.internal_sobjects SET enableSync=true WHERE objectname='${objName}';`),
      database.query(`DROP TABLE IF EXISTS ${SCHEMA}.${objName};`).then(() => synchronizeTable(objName, true))
    ]);
    return Promise.resolve();
  }
  return Promise.reject(Error(`object ${name} does not exist`));
}