import { ApiClient } from '../../../src/lib/salesforce/api-client';
import nock from 'nock';
import { assert } from 'chai';

describe('ApiClient', () => {
  const loginUrl = 'http://login.salesforce.com/';
  const config = {
    clientId: 'testClientId',
    clientSecret: 'testClientSecret',
    username: 'test',
    password: 'password',
    securityToken: 'secToken',
    loginUrl,
  };

  const accessToken = 'fakeAccesstoken';
  const tokenType = 'Bearer';
  const instanceUrl = 'http://my.fakesalesforce.com';

  const testServiceRoute = '/testservice';
  const responseBody = 'mockResponseBody';

  beforeEach(() => {
    nock(loginUrl)
      .post('/services/oauth2/token')
      .reply(200, {
        'access_token': accessToken,
        'instance_url': instanceUrl,
        'id': 'https://login.salesforce.com/id/asda/123123131gRIQAY',
        'token_type': tokenType,
        'issued_at': '51237891192',
        'signature': 'AJlqEJLWE1jll@#!2031l+13@#J!l12l3=',
      });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it ('should send request with auth header', async () => {
    const apiClient = new ApiClient(config);

    nock(instanceUrl)
      .get(testServiceRoute)
      .reply(200, function() {
        assert(this.req.headers['authorization'] === `${tokenType} ${accessToken}`, 'send access token in request');
        return responseBody;
      });

    const res = await apiClient.request({
      method: 'GET',
      url: testServiceRoute,
    });
    assert(res.body === responseBody, 'get response');
  });
});
