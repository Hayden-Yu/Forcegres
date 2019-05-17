import { force as sf } from '../../config/force';
import { logger } from '../../config/logger';
import { DescribeGlobalSObjectResult } from 'jsforce';

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

  public describeObject(objectName: string) {
    return new Promise((resolve, reject) => {
      sf.describe(objectName, (err, meta) => {
        logger.debug(`describing ${objectName} sf object`);
        if (err) {
          logger.error(err.message);
          return reject(err);
        }
        return resolve(meta);
      });
    });
  }
}