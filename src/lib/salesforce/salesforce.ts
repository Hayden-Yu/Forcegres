import { ApiClient, Config } from "./api-client";
import { Soql } from "./soql";
import { Sobject } from "./sobject";
import { Logger } from "../Logger";

export class Salesforce {
  public client: ApiClient;
  public soql: Soql;
  public sobject: Sobject;

  constructor(
    config: Config,
    logger?: Logger
    ) {
      this.client = new ApiClient(config, logger);
      this.soql = new Soql(this.client, logger);
      this.sobject = new Sobject(this.client, logger);
  }
}
