import { ApiClient } from "./api-client";
import { Soql } from "./soql";
import { Sobject } from "./sobject";

export class Salesforce {
  public client: ApiClient;
  public soql: Soql;
  public sobject: Sobject;

  constructor(
    clientId: string,
    clientSecret: string,
    username: string,
    password: string,
    securityToken: string,
    loginUrl?: string,
    version?: string) {
      this.client = new ApiClient(clientId, clientSecret, username, password, securityToken, loginUrl, version);
      this.soql = new Soql(this.client);
      this.sobject = new Sobject(this.client);
  }
}