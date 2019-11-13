import { ApiClient } from "./api-client";
import { QueryResult } from "jsforce";
import { Logger, loggerPlaceHolder } from "../Logger";

export class Soql {
  client: ApiClient;
  logger: Logger;

  constructor(client: ApiClient, logger?: Logger) {
    this.client = client;
    this.logger = logger || loggerPlaceHolder;
  }

  query(qry: string): Promise<QueryResult<any>> {
    return this.client.request({
      method: 'GET',
      url: `/services/data/${this.client.version}/query?q=${encodeURI(qry)}`,
    }).then(async res => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        this.logger.debug(qry);
        this.logger.error(JSON.parse(res.body));
        return Promise.reject(Error('soql failure'));
      }
      return JSON.parse(res.body);
    })
  }

  queryMore(locator: string): Promise<QueryResult<any>> {
    return this.client.request({
      method: 'GET',
      url: locator,
      timeout: 30 * 1000
    }).then(async res => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        this.logger.error(JSON.parse(res.body));
        return Promise.reject(Error('soql failure'));
      }
      return JSON.parse(res.body);
    }, err => {
      if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
        this.logger.silly('retry soql after socket timeout')
        return this.queryMore(locator)
      }
      this.logger.error(err)
      throw err;
    })
  }

  async bulkQuery(qry: string): Promise<BulkQueryResult> {
    const query = JSON.parse((await this.client.request({
      method: 'POST',
      url: `/services/data/${this.client.version}/jobs/query`,
      body: JSON.stringify({
        operation: 'query',
        query: qry,
      }),
      headers: {'Content-Type': 'application/json'}
    })).body);
    this.logger.debug(`bulk query [${query.id}] requested`);
    let numberOfCollisions = 0;
    while (true) {
      await this.wait((Math.pow(2, numberOfCollisions++) - 1) * 1000);
      const status = JSON.parse((await this.client.request({
        method: 'GET',
        url: `/services/data/${this.client.version}/jobs/query/${query.id}`,
      })).body);
      this.logger.debug(`bulk query [${query.id}] ${status.state} on attempt ${numberOfCollisions}`);
      if (status.state === 'JobComplete') {
        status.result = (await this.client.request({
          method: 'GET',
          url: `/services/data/${this.client.version}/jobs/query/${query.id}/results`,
        })).body;
        return status;
      } else if (status.state === 'Aborted' || status.state === 'Failed') {
        return Promise.reject(status);
      }
    }
  }

  wait(millisec: number) {
    return new Promise((resolve) => setTimeout(resolve, millisec));
  }
}

export type BulkQueryResult = {
  id: string,
  operation: string,
  object: string,
  createdDate: string,
  systemModstamp: string,
  state: string,
  concurrencyMode: string,
  contentType: string,
  apiVersion: string,
  lineEnding: string,
  columnDelimiter: string,
  numberRecordsProcessed: number,
  retries: number,
  totalProcessingTime: number,
  result?: string,
}