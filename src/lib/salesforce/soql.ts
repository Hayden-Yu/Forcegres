import { ApiClient } from "./api-client";
import { logger } from '../../config/logger';
import { QueryResult } from "jsforce";

export class Soql {
  client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  query(qry: string): Promise<QueryResult<any>> {
    return this.client.request({
      method: 'GET',
      url: `${this.client.url}/services/data/${this.client.version}/query?q=${encodeURI(qry)}`,
    }).then(res => JSON.parse(res.body))
  }

  queryMore(locator: string): Promise<QueryResult<any>> {
    return this.client.request({
      method: 'GET',
      url: `${this.client.url}${locator}`,
      timeout: 30 * 1000
    }).then(res => res.body, err => {
      logger.error(err)
      if (err.code === 'ETIMEDOUT') {
        return this.queryMore(locator)
      }
      throw err;
    })
  }
}