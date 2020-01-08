import * as SyncronizeDatabase from '../src/core/synchronize-database'
import * as Cycle from '../src/core/cycle';
import sinon from 'sinon'
import { init, exec } from '../src/forcegres';
import { assert } from 'chai';

describe("forcegres", () => {
  const initalizeDatabase = sinon.stub(SyncronizeDatabase, 'initalizeDatabase')
  const loadSobjectList = sinon.stub(SyncronizeDatabase, 'loadSobjectList')
  const cycle = sinon.stub(Cycle, 'cycle')

  it('should init and load sobjects list', async () => {
    await init()
    assert(initalizeDatabase.calledOnce, 'should initalize database')
    assert(loadSobjectList.calledOnce, 'should load sobjects list')
  })

  it('should keep running cycle after cycle', async () => {
    cycle.onCall(0).resolves()
    cycle.onCall(1).resolves()
    cycle.onCall(2).rejects()
    try {
      await exec()
    } catch (ignore) {}
    assert(cycle.calledThrice, 'should keep cycling until error')
  })
})