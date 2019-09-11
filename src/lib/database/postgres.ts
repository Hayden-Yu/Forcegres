import { Pool, QueryResult, PoolConfig, types } from 'pg';
import { Logger, loggerPlaceHolder } from '../Logger';
import { EventEmitter } from 'events';

types.setTypeParser(1114, value=>value);

export class Postgres {
  private MAX_POOL_SIZE: number;

  private client: Pool;
  private queue: QueryRequest[] = [];
  private activeWorker = 0;
  private events = new EventEmitter();
  private logger: Logger;
  
  constructor(config: PoolConfig, logger?: Logger) {
    this.client = new Pool(config);
    this.logger = logger || loggerPlaceHolder;
    this.MAX_POOL_SIZE = config.max || 10;
    this.events.on('enqueue', () => {
      this.logger.silly('pg query queued');
      this._dequeue();
    });
    this.events.on('dequeue', this._dequeue.bind(this));
  }

  query(qryStr: string, values?: any[]): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        query: qryStr,
        params: values,
        resolve: resolve,
        reject: reject
      });
      this.events.emit('enqueue');
    });
  }

  disconnect() {
    this.logger.debug(`disconnecting pg pool with ${this.activeWorker} job running and ${this.queue.length} left in queue`);
    return this.client.end();
  }

  private _dequeue() {
    if (this.MAX_POOL_SIZE > this.activeWorker) {
      const task = this.queue.shift();
      if (task) {
        this.logger.silly(`picked up pg query`)
        try {
          ++this.activeWorker;
          this.client.query(task.query, task.params || [], (err, result) => {
            --this.activeWorker;
            this.events.emit('dequeue');
            this.logger.silly('pg query finished');
            if (err) {
              this.logger.debug(task.query);
              this.logger.error(err);
              return task.reject(err);
            }
            task.resolve(result);
          })
        } catch (err) {
          task.reject(err);
        }
      }
    }
  }
}

export type QueryRequest = {
  query: string,
  params?: any[],
  resolve: (value?: QueryResult | PromiseLike<QueryResult>) => void,
  reject: (reason?: any) => void,
}
