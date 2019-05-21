import { Connection, DescribeSObjectResult } from 'jsforce';
import { environments } from '../environments/environments';
import { logger } from './logger';

type limitInfo = {
  limitInfo: {
    apiUsage: {
      limit: number,
      used: number
    }
  }
}

type prototype_ = {
  prototype: any
}

type DescribeWithTimestampAPI = {
  describe(type: string, callback: (err: Error, result: DescribeSObjectResult) => void, timestamp?: string): Promise<DescribeSObjectResult>;
}

(<Connection & DescribeWithTimestampAPI & prototype_><unknown>Connection).prototype.describe = 
function(type: string, callback: (err: Error, result: DescribeSObjectResult) => void, timestamp?: string) {
  var url = [ this._baseUrl(), "sobjects", type, "describe" ].join('/');
  return this.request(timestamp ? {
    url: url,
    headers: {'If-Modified-Since': timestamp}
  }: url).thenCall(callback);
};

export const force = <Connection & limitInfo & DescribeWithTimestampAPI> new Connection({
  clientId: environments.force.clientId,
  clientSecret: environments.force.clientSecret,
  loginUrl: environments.force.url,
})

export const login = () => 
  new Promise((resolve, reject) => {
    force.login(environments.force.username, environments.force.password, (err, info) => {
      if (err) {
        logger.error(`salesforce login error: ${err}`);
        return reject(err);
      }
      logger.info(`salesforce user ${info.id} authenticated`);
      resolve(force);
    });
  });