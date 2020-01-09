import sinon, { SinonStubbedInstance } from 'sinon';
import { Soql } from '../../../src/lib/salesforce/soql';
import { ApiClient } from '../../../src/lib/salesforce/api-client';
import request from 'request';
import { QueryResult } from 'jsforce';
import chai from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import { assert } from 'chai';
chai.use(ChaiAsPromised);

const API_VERSION = 'v46.0'
const Sandbox = sinon.createSandbox()


describe('Soql', () => {
  const query = 'SELECT+Id+FROM+Account'
  const locator = '/ksdjjsdksjasda'
  const fakeResponse: QueryResult<any> = {
    records: [{
      Id: 'ak1l23klQWE',
    }],
    nextRecordsUrl: locator,
    done: false,
    totalSize: 1,
  }

  const timeoutOnceLocator = '/lkasdkasTimeout'
  const timeOutErr = {
    code: 'ECONNRESET'
  };

  const errorQuery = 'SELEC+Fail'
  const errorLocator = '/kaskalError'
  const fakeErrorResponse = {
    statusCode: 400,
    body: JSON.stringify({
      message: "Bad request message"
    })
  }

  let timedOut = false;
  let apiClient: ApiClient
  let soql: Soql
  let requestMethod: SinonStubbedInstance<any>;

  beforeEach(() => {
    apiClient = new ApiClient({
      clientId: '', 
      clientSecret: '', 
      username: '', 
      password: '', 
      securityToken: '',
      loginUrl: '', 
      version: API_VERSION
    });
    soql = new Soql(apiClient);

    requestMethod = Sandbox.stub(ApiClient.prototype, 'request').callsFake((arg) => {
      if (!timedOut && arg && (arg as any).url && (arg as any).url.endsWith(timeoutOnceLocator)) {
        timedOut = true;
        return Promise.reject(timeOutErr);
      }
      if (arg && (arg as any).url && ((arg as any).url.endsWith(errorQuery) || (arg as any).url.endsWith(errorLocator))) {
        return Promise.resolve(fakeErrorResponse as any as request.Response);
      }
      return Promise.resolve({
          body: JSON.stringify(fakeResponse)
        } as any as request.Response)
    })
  })

  afterEach(() => {
    Sandbox.restore()
  })

  it('should send query', async () => {
    const res = await soql.query(query)
    chai.assert((requestMethod.getCall(0).args[0] as any).url === '/services/data/'+apiClient.version+'/query?q='+query, 'query should send in url')
    chai.assert(JSON.stringify(res)===JSON.stringify(fakeResponse), 'response should be API response')
  })

  it('should send query locator', async () => {
    const res = await soql.queryMore(locator)
    chai.assert((requestMethod.getCall(0).args[0] as any).url === locator, 'locator should send in url')
    chai.assert(JSON.stringify(res)===JSON.stringify(fakeResponse), 'response should be API response')
  })

  it('should timeout and retry on follow up query', async () => {
    const res = await soql.queryMore(timeoutOnceLocator)
    chai.assert((requestMethod.getCall(0).args[0] as any).url === (requestMethod.getCall(1).args[0] as any).url
           && (requestMethod.getCall(0).args[0] as any).url === timeoutOnceLocator, 'should retry on timeout');
    chai.assert(JSON.stringify(res)===JSON.stringify(fakeResponse), 'response should be successful API response')
  })

  it ('should fail on API error', async () => {
    chai.expect(soql.query(errorQuery)).to.eventually.rejectedWith(Error, "soql failure")
    chai.expect(soql.queryMore(errorLocator)).to.eventually.rejectedWith(Error, "soql failure")
  })

  it ('can bulk query csv', async () => {
    const JOB_COMPLETE = 'JobComplete'

    const mockQuery = 'SELECT * FROM Account'
    const mockQueryObjId = '750R0000000zlh9IAA'
    const mockQueryObj = {
      "id" : mockQueryObjId,
      "operation" : "query",
      "object" : "Account",
      "createdById" : "005R0000000GiwjIAC",
      "createdDate" : "2018-12-10T17:50:19.000+0000",
      "systemModstamp" : "2018-12-10T17:50:19.000+0000",
      "state" : "UploadComplete",
      "concurrencyMode" : "Parallel",
      "contentType" : "CSV",
      "apiVersion" : API_VERSION,
      "lineEnding" : "LF",
      "columnDelimiter" : "COMMA"
   }
   const mockData = 'Id\nkajsdk'

    requestMethod.callsFake((arg: any) => {
      if (arg.body && JSON.parse(arg.body).query
        && JSON.parse(arg.body).query === mockQuery) {
          return Promise.resolve({
            body: JSON.stringify(mockQueryObj)
          } as request.Response)
      }
      if ((arg as any).url.endsWith(mockQueryObjId)) {
        return Promise.resolve({
          body: JSON.stringify(Object.assign(mockQueryObj, {state: JOB_COMPLETE}))
        } as request.Response)
      }
      if ((arg as any).url.endsWith(`${mockQueryObjId}/results`)) {
        return Promise.resolve({
          body: mockData
        } as request.Response)
      }
      return Promise.resolve({} as request.Response);
    })

    const res = await soql.bulkQuery(mockQuery);
    assert(res.result === mockData, "should retrieve csv data")
  })
})

