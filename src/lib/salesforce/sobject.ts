import { ApiClient } from "./api-client";
import { DescribeGlobalResult, DescribeSObjectResult, UpdatedRecordsInfo, DeletedRecordsInfo, Field } from 'jsforce';
import { Logger, loggerPlaceHolder } from "../Logger";

export class Sobject {
  client: ApiClient;
  logger: Logger;

  constructor(client: ApiClient, logger?: Logger) {
    this.client = client;
    this.logger = logger || loggerPlaceHolder;
  }

  listAll(): Promise<DescribeGlobalResult> {
    return this.client.request({
      method: 'GET',
      url: `/services/data/${this.client.version}/sobjects/`,
    }).then(res => JSON.parse(res.body))
  }

  describe(name: string): Promise<DescribeSObjectResult> {
    return this.client.request({
      method: 'GET',
      url: `/services/data/${this.client.version}/sobjects/${name}/describe`,
    }).then(res => JSON.parse(res.body))
  }

  recentUpdted(name: string, strat: string, end: string): Promise<UpdatedRecordsInfo> {
    return this.client.request({
      method: 'GET',
      url: `/services/data/${this.client.version}/sobjects/${name}/updated?start=${this.sfIsoDate(strat)}&end=${this.sfIsoDate(end)}`,
    }).then(res => JSON.parse(res.body))
  }

  recentDeleted(name: string, start: string, end: string): Promise<DeletedRecordsInfo> {
    return this.client.request({
      method: 'GET',
      url: `/services/data/${this.client.version}/sobjects/${name}/deleted?start=${this.sfIsoDate(start)}&end=${this.sfIsoDate(end)}`,
    }).then(res => JSON.parse(res.body))
  }

  async selectStar(name: string, where?: string, fields?: Field[]): Promise<string> {
    if (!fields) {
      fields = (await this.describe(name)).fields;
    }
    const q = `SELECT ${fields.map(f=>f.name).join(',')} FROM ${name}`
    return where ? q + where : q;
  }

  private sfIsoDate(date: string | Date) {
    if (typeof date === 'string') {
      date = new Date(date)
    }
    return date.getUTCFullYear() +
    '-' + `${date.getUTCMonth() + 1}`.padStart(2, '0') +
    '-' + `${date.getUTCDate()}`.padStart(2, '0') +
    'T' + `${date.getUTCHours() + 1}`.padStart(2, '0') +
    ':' + `${date.getUTCMinutes() + 1}`.padStart(2, '0') +
    ':' + `${date.getUTCSeconds() + 1}`.padStart(2, '0') +
    'Z';
  }
}