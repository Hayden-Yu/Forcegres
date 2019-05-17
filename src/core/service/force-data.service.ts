import { force as sf } from '../../config/force';
import { logger } from '../../config/logger';

export class ForceDataService {
  private static queryMore(locator: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      try {
        sf.queryMore(locator, undefined, (err, res) => {
          if (err) {
            return reject(err);
          }
          if (!res.done) {
            return this.queryMore(<string>res.nextRecordsUrl)
              .then((records: any[]) => resolve(res.records.concat(records)))
              .catch(reject);
          }
          resolve(res.records);
        });
      } catch (err) {
        logger.error(err);
        reject(err);
      }
    });
  }

  public static query(query: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        sf.query(query, undefined,
          (err, res) => {
            if (err) {
              return reject(err);
            }
            if (!res.done) {
              return this.queryMore(<string>res.nextRecordsUrl)
                .then(records => resolve(res.records.concat(records)))
                .catch(reject);
            }
            resolve(res.records);
          });
      } catch (err) {
        logger.error(err);
        reject(err);
      }
    });
  }

  public static getRecentUpdates(objectName: string, from: string, to: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      sf.sobject(objectName).updated(from, to, (err, res) => {
        logger.debug(`retrieving recent updates on object ${objectName}`)
        if (err) {
          logger.error(err.message);
          return reject(err);
        }
        logger.debug(`found ${res.ids.length} updates`);
        return resolve(res.ids);
      });
    });
  }

  public static getRecentDeletes(objectName: string, from: string, to: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      sf.sobject(objectName).deleted(from, to, (err, res) => {
        logger.debug(`retrieving recent deletes on object ${objectName}`)
        if (err) {
          logger.error(err.message);
          return reject(err);
        }
        logger.debug(`found ${(<any>res.deletedRecords).length} deletes`); // bug from type definition
        return resolve((<any>res.deletedRecords).map((el: any) => el.id));
      });
    });
  }
}