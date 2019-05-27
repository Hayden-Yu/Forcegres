import { force as sf } from '../../config/force';
import { logger } from '../../config/logger';
import { QueryResult } from 'jsforce';

export class ForceDataService {

  public static query(query: string): Promise<QueryResult<any>> {
    return new Promise((resolve, reject) => {
      try {
        sf.query(query, undefined, (err, res) => {
          if (err) {
            logger.debug(query);
            return reject(err);
          }
          return resolve(res);
        });
      } catch (err) {
        logger.error(err);
        reject(err);
      }
    })
  }

  public static queryNext(prev: QueryResult<any>): Promise<QueryResult<any>> {
    return new Promise((resolve, reject) => {
      if (!prev.nextRecordsUrl) {
        return resolve({
          records: [],
          done: true,
          totalSize: 0,
        });
      }
      try {
        sf.queryMore(prev.nextRecordsUrl, undefined, (err, res) => {
          if (err) {
            return reject(err);
          }
          return resolve(res);
        });
      } catch (err) {
        logger.error(err);
        reject(err);
      }
    })
  }

  public static getRecentUpdates(objectName: string, from: string, to: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      sf.sobject(objectName).updated(from, to, (err, res) => {
        if (err) {
          logger.error(err.message);
          return reject(err);
        }
        logger.debug(`found ${res.ids.length} updates on ${objectName}`);
        return resolve(res.ids);
      });
    });
  }

  public static getRecentDeletes(objectName: string, from: string, to: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      sf.sobject(objectName).deleted(from, to, (err, res) => {
        if (err) {
          logger.error(err.message);
          return reject(err);
        }
        logger.debug(`found ${res.deletedRecords.length} deletes on ${objectName}`);
        return resolve(res.deletedRecords.map(el => el.id));
      });
    });
  }
}