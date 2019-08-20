import request from 'request';
import querystring from 'querystring';
import { logger } from '../../config/logger';
export class ApiClient {
  private clientId: string;
  private clientSecret: string;
  private username: string;
  private password: string;
  private loginUrl: string;
  private _version: string;

  private accessToken?: string;
  private _url?: string;

  private _limitInfo = '';

  constructor(
    clientId: string,
    clientSecret: string,
    username: string,
    password: string,
    securityToken: string,
    loginUrl?: string,
    version?: string
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.username = username;
    this.password = password + (securityToken || '');
    this.loginUrl = loginUrl || 'https://login.salesforce.com/';
    this._version = version || 'v46.0';
  }

  private auth() {
    logger.info('authenticating salesforce');
    return new Promise((resolve, reject) => {
      request(`${this.loginUrl}services/oauth2/token`, {
        method: 'POST', 
        body: querystring.stringify({
          'grant_type': 'password',
          'client_id': this.clientId,
          'client_secret': this.clientSecret,
          'username': this.username,
          'password': this.password,
        })
      }, (err, res) => {
        if (res && res.statusCode === 200) {
          const dt = JSON.parse(res.body)
          this.accessToken = dt['access_token'];
          this._url = dt['instance_url'];
          return resolve()
        }
        if (err || (res.statusCode !== 200)) {
          logger.error(err || res);
          return reject(err || res);
        }
      })
    });
  }

  public get url(): string {
    return this._url || '';
  }

  public get version(): string {
    return this._version;
  }

  public request(req: request.RequiredUriUrl & request.CoreOptions, noAuth?: boolean): Promise<request.Response> {
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