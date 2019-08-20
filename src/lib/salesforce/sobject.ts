import { ApiClient } from "./api-client";
import { DescribeGlobalResult, DescribeSObjectResult, UpdatedRecordsInfo, DeletedRecordsInfo, Field } from 'jsforce';

export class Sobject {
  client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  listAll(): Promise<DescribeGlobalResult> {
    return this.client.request({
      method: 'GET',
      url: `${this.client.url}/services/data/${this.client.version}/sobjects/`,
    }).then(res => JSON.parse(res.body))
  }

  describe(name: string): Promise<DescribeSObjectResult> {
    return this.client.request({
      method: 'GET',
      url: `${this.client.url}/services/data/${this.client.version}/sobjects/${name}/describe`,
    }).then(res => JSON.parse(res.body))
  }

  recentUpdted(name: string, strat: string, end: string): Promise<UpdatedRecordsInfo> {
    return this.client.request({
      method: 'GET',
      url: `${this.client.url}/services/data/${this.client.version}/sobjects/${name}/updated?start=${strat}&end=${end}`,
    }).then(res => JSON.parse(res.body))
  }

  recentDeleted(name: string, start: string, end: string): Promise<DeletedRecordsInfo> {
    return this.client.request({
      method: 'GET',
      url: `${this.client.url}/services/data/${this.client.version}/sobjects/${name}/deleted?start=${start}$end=${end}`,
    }).then(res => JSON.parse(res.body))
  }

  async selectStar(name: string, where: string, fields?: Field[]): Promise<string> {
    if (!fields) {
      fields = (await this.describe(name)).fields;
    }
    const q = `SELECT ${fields.map(f=>f.name).join(',')} FROM ${name}`
    return where ? q + where : q;
  }
}