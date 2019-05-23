import { force as sf } from '../../config/force';
import { logger } from '../../config/logger';
import { DescribeGlobalSObjectResult, DescribeSObjectResult } from 'jsforce';

export class ForceSchemaService {
  public static listObjects(): Promise<DescribeGlobalSObjectResult[]> {
    return new Promise((resolve, reject) => {
      sf.describeGlobal((err, res) => {
        logger.debug('retrieving sf global schema');
        if (err) {
          logger.error(err.message);
          return reject(err);
        }
        logger.debug(`found ${res.sobjects.length} sf object types`);
        return resolve(res.sobjects);
      });
    });
  }

  public static describeObject(objectName: string, timestamp?: string): Promise<DescribeSObjectResult> {
    return new Promise((resolve, reject) => {
      sf.describe(objectName, (err, meta) => {
        logger.debug(`describing ${objectName} sf object${timestamp ? ` if modified after ${timestamp}` : ''}`);
        if (err) {
          if (err.message === 'read ECONNRESET') {
            const RETRY_TIMEOUT = 500;
            logger.warning(`describe object ${objectName} socket hang up, retry in ${RETRY_TIMEOUT} ms`);
            setTimeout(() => {
              resolve(this.describeObject(objectName, timestamp));
            }, RETRY_TIMEOUT);
          } else {
            logger.error(err.message);
            return reject(err);
          }
        }
        return resolve(meta);
      }, timestamp);
    });
  }

  public static generateSelectStar(schema: DescribeSObjectResult) {
    return `SELECT ${schema.fields.map(f=>f.name).join(',')} FROM ${schema.name}`;
  }
}