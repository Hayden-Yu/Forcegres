import { ApiClient } from './api-client';
import { DescribeGlobalResult, DescribeSObjectResult, UpdatedRecordsInfo, DeletedRecordsInfo, Field } from 'jsforce';
import { Logger, loggerPlaceHolder } from '../Logger';

export class Sobject {
  private client: ApiClient;
  private logger: Logger;

  constructor(client: ApiClient, logger?: Logger) {
    this.client = client;
    this.logger = logger || loggerPlaceHolder;
  }

  public listAll(): Promise<DescribeGlobalResult> {
    return this.client.request({
      method: 'GET',
      url: `/services/data/${this.client.version}/sobjects/`,
    }).then(res => JSON.parse(res.body));
  }

  public describe(name: string, ignoreCompoundField = true): Promise<DescribeSObjectResult> {
    return this.client.request({
      method: 'GET',
      url: `/services/data/${this.client.version}/sobjects/${name}/describe`,
    })
    .then(res => JSON.parse(res.body))
    .then((schema: DescribeSObjectResult) => {
      if (ignoreCompoundField) {
        const compoundFields = new Set();
        schema.fields.forEach(f => {
          if (f.compoundFieldName) {
            compoundFields.add(f.compoundFieldName);
          }
        });
        schema.fields = schema.fields.filter(f => !compoundFields.has(f.name));
      }
      return schema;
    });
  }

  public recentUpdted(name: string, strat: string, end: string): Promise<UpdatedRecordsInfo> {
    return this.client.request({
      method: 'GET',
      url: `/services/data/${this.client.version}/sobjects/${name}/updated?start=${this.sfIsoDate(strat)}&end=${this.sfIsoDate(end)}`,
    }).then(res => JSON.parse(res.body));
  }

  public recentDeleted(name: string, start: string, end: string): Promise<DeletedRecordsInfo> {
    return this.client.request({
      method: 'GET',
      url: `/services/data/${this.client.version}/sobjects/${name}/deleted?start=${this.sfIsoDate(start)}&end=${this.sfIsoDate(end)}`,
    }).then(res => JSON.parse(res.body));
  }

  public async selectStar(name: string, where?: string, fields?: Field[]): Promise<string> {
    if (!fields) {
      fields = (await this.describe(name)).fields;
    }
    const q = `SELECT ${fields.map(f => f.name).join(',')} FROM ${name}`;
    return where ? q + where : q;
  }

  private sfIsoDate(date: string | Date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.getUTCFullYear() +
    '-' + `${date.getUTCMonth() + 1}`.padStart(2, '0') +
    '-' + `${date.getUTCDate()}`.padStart(2, '0') +
    'T' + `${date.getUTCHours() }`.padStart(2, '0') +
    ':' + `${date.getUTCMinutes()}`.padStart(2, '0') +
    ':' + `${date.getUTCSeconds()}`.padStart(2, '0') +
    'Z';
  }
}
