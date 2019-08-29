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
    }).then(res => JSON.parse(res.body))
  }

  queryMore(locator: string): Promise<QueryResult<any>> {
    return this.client.request({
      method: 'GET',
      url: locator,
      timeout: 30 * 1000
    }).then(res => JSON.parse(res.body), err => {
      this.logger.error(err)
      if (err.code === 'ETIMEDOUT') {
        return this.queryMore(locator)
      }
      throw err;
    })
  }
}