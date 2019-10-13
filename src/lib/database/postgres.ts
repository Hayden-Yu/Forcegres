import { Pool, QueryResult, PoolConfig, types, ClientBase } from 'pg';
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
    this.events.on('dequeue', () => {
      this.logger.silly('pg query finished');
      this._dequeue();
    });
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

  transact(transaction: Transaction): Promise<void> {
    return new Promise((resolve: () => void, reject) => {
      this.queue.push({
        transaction: transaction,
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

  _query(task: QueryRequest) {
    const query = task.query as string;
    this.client.query(query, task.params || [], (err, result) => {
      --this.activeWorker;
      this.events.emit('dequeue');
      if (err) {
        this.logger.debug(query);
        this.logger.error(err);
        return task.reject(err);
      }
      task.resolve(result);
    })
  }

  async _transact(task: QueryRequest) {
    const transaction = task.transaction as Transaction;
    const conn = await this.client.connect();
    try {
      await conn.query('BEGIN');
      this.logger.info('begin transaction');
      await transaction(new Connection(conn, this.logger));
      this.logger.info('commit transaction');
      await this.query('COMMIT');
      task.resolve();
    } catch (err) {
      this.logger.error(err);
      this.logger.info('rollback transaction');
      await this.query('ROLLBACK');
      task.reject(err);
    } finally {
      await conn.release();
      --this.activeWorker;
      this.events.emit('dequeue');
    }
  }

  count = 0;
  private _dequeue() {
    this.logger.silly('attempt dequeue')
    if (this.MAX_POOL_SIZE > this.activeWorker) {
      const task = this.queue.shift();
      if (task) {
        this.logger.debug(`processed ${this.count++} queries`)
        this.logger.debug(`memory usage: ${process.memoryUsage().heapUsed}`)
        this.logger.silly(`picked up pg query`);
        try {
          ++this.activeWorker;
          if (task.transaction) {
            return this._transact(task);
          }
          if (task.query) {
            return this._query(task);
          }
        } catch (err) {
          task.reject(err);
        }
      }
    }
  }
}

export type QueryRequest = {
  transaction?: Transaction,
  query?: string,
  params?: any[],
  resolve: (value?: QueryResult | PromiseLike<QueryResult>) => void,
  reject: (reason?: any) => void,
}

export class Connection {
  private client: ClientBase;
  private logger: Logger;

  constructor(client: ClientBase, logger: Logger) {
    this.client = client;
    this.logger = logger;
  }

  query(qryStr: string, values?: any[]): Promise<QueryResult> {
    return new Promise((resolve, reject) => this.client.query(qryStr, values || [], (err, res) => {
      if (err) {
        this.logger.debug(qryStr);
        this.logger.error(err);
        return reject(err);
      }
      return resolve(res);
    }))
  }
}

export type Transaction = (conn: Connection) => Promise<void>
export type Query = (qry: string, values?: any[]) => Promise<QueryResult>;
