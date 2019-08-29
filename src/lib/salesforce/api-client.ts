import request from 'request';
import querystring from 'querystring';
import { Logger, loggerPlaceHolder } from '../Logger';

export class ApiClient {
  private clientId: string;
  private clientSecret: string;
  private username: string;
  private password: string;
  private loginUrl: string;
  private _version: string;

  private accessToken?: string;
  private baseUrl?: string;

  private _limitInfo = '';
  private logger: Logger;

  constructor(
    config: Config,
    logger?: Logger
  ) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.username = config.username;
    this.password = config.password + (config.securityToken || '');
    this.loginUrl = config.loginUrl || 'https://login.salesforce.com/';
    this._version = config.version || 'v46.0';
    this.logger = logger || loggerPlaceHolder;
  }

  private auth() {
    this.logger.info('authenticating salesforce');
    return new Promise((resolve, reject) => {
      request(`${this.loginUrl}services/oauth2/token`, {
        method: 'POST', 
        body: querystring.stringify({
          'grant_type': 'password',
          'client_id': this.clientId,
          'client_secret': this.clientSecret,
          'username': this.username,
          'password': this.password,
        }),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      }, (err, res) => {
        if (res && res.statusCode === 200) {
          const dt = JSON.parse(res.body)
          this.accessToken = dt['access_token'];
          this.baseUrl = dt['instance_url'];
          return resolve()
        }
        if (err || (res.statusCode !== 200)) {
          this.logger.error(err || res);
          return reject(err || res);
        }
      })
    });
  }

  public get version(): string {
    return this._version;
  }

  public async request(req: request.RequiredUriUrl & request.CoreOptions, noAuth?: boolean): Promise<request.Response> {
    if (!this.accessToken) {
      await this.auth();
    }
    req.baseUrl = this.baseUrl;
    if (!req.headers) {
      req.headers = {'Authorization': `Bearer ${this.accessToken}`};
    } else {
      req.headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return new Promise((resolve, reject) => {
      request(req, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err)
        }
        if (res.statusCode === 401 && !noAuth) {
          return this.auth().then(() => this.request(req, true))
        } else {
          if (res.headers['Sforce-Limit-Info']) {
            this._limitInfo = <string> res.headers['Sforce-Limit-Info'];
          }
          return resolve(res);
        }
      })
    });
  }

  public get limitInfo() {
    return this._limitInfo;
  }
}

export type Config = {
  clientId: string,
  clientSecret: string,
  username: string,
  password: string,
  securityToken: string,
  loginUrl?: string,
  version?: string,
}
