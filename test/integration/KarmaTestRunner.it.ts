import * as chai from 'chai';
import KarmaTestRunner from '../../src/KarmaTestRunner';
import { CoverageCollection, RunnerOptions, RunResult, RunState, TestState } from 'stryker-api/test_runner';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
let expect = chai.expect;

describe('KarmaTestRunner', function () {

  let sut: KarmaTestRunner;
  this.timeout(10000);

  let expectToHaveSuccessfulTests = (result: RunResult, n: number) => {
    expect(result.tests.filter(t => t.state === TestState.Success)).to.have.length(n);
  };
  let expectToHaveFailedTests = (result: RunResult, n: number) => {
    expect(result.tests.filter(t => t.state === TestState.Failed)).to.have.length(n);
  };

  describe('when all tests succeed', () => {
    let testRunnerOptions: RunnerOptions;

    before(() => {
      testRunnerOptions = {
        files: [
          { path: 'testResources/sampleProject/src/Add.js', mutated: true, included: true },
          { path: 'testResources/sampleProject/test/AddSpec.js', mutated: false, included: true }],
        port: 9877,
        strykerOptions: { logLevel: 'trace' }
      };
    });

    describe('with simple add function to test', () => {

      before(() => {
        sut = new KarmaTestRunner(testRunnerOptions);
        return sut.init();
      });

      it('should report completed tests', () => {
        return expect(sut.run()).to.eventually.satisfy((runResult: RunResult) => {
          expectToHaveSuccessfulTests(runResult, 5);
          expectToHaveFailedTests(runResult, 0);
          expect(runResult.state).to.be.eq(RunState.Complete);
          return true;
        });
      });

      it('should be able to run twice in quick succession',
        () => expect(sut.run().then(() => sut.run())).to.eventually.have.property('state', RunState.Complete));
    });
  });

  describe('when some tests fail', () => {
    before(() => {
      const testRunnerOptions = {
        files: [
          { path: 'testResources/sampleProject/src/Add.js', mutated: true, included: true },
          { path: 'testResources/sampleProject/test/AddSpec.js', mutated: false, included: true },
          { path: 'testResources/sampleProject/test/AddFailedSpec.js', mutated: false, included: true }
        ],
        port: 9878,
        strykerOptions: { logLevel: 'trace' }
      };
      sut = new KarmaTestRunner(testRunnerOptions);
      return sut.init();
    });

    it('should report failed tests', () => {
      return expect(sut.run()).to.eventually.satisfy((runResult: RunResult) => {
        expectToHaveSuccessfulTests(runResult, 5);
        expectToHaveFailedTests(runResult, 2);
        expect(runResult.state).to.be.eq(RunState.Complete);
        return true;
      });
    });
  });

  describe('when an error occures while running tests', () => {

    before(() => {
      const testRunnerOptions = {
        files: [{ path: 'testResources/sampleProject/src/Error.js', mutated: true, included: true }, { path: 'testResources/sampleProject/test/AddSpec.js', mutated: true, included: true }],
        port: 9879,
        strykerOptions: {}
      };
      sut = new KarmaTestRunner(testRunnerOptions);
      return sut.init();
    });

    it('should report Error with the error message', () => {
      return expect(sut.run()).to.eventually.satisfy((runResult: RunResult) => {
        expectToHaveSuccessfulTests(runResult, 0);
        expectToHaveFailedTests(runResult, 0);
        expect(runResult.state).to.be.eq(RunState.Error);
        expect(runResult.errorMessages.length).to.equal(1);
        expect(runResult.errorMessages[0].indexOf('ReferenceError: Can\'t find variable: someGlobalVariableThatIsNotDeclared\nat')).to.eq(0);
        return true;
      });
    });
  });

  describe('when no error occured and no test is performed', () => {
    before(() => {
      const testRunnerOptions = {
        files: [{ path: 'testResources/sampleProject/src/Add.js', mutated: true, included: true }, { path: 'testResources/sampleProject/test/EmptySpec.js', mutated: true, included: true }],
        port: 9880,
        strykerOptions: {}
      };
      sut = new KarmaTestRunner(testRunnerOptions);
      return sut.init();
    });

    it('should report Complete without errors', () => {
      return expect(sut.run()).to.eventually.satisfy((runResult: RunResult) => {
        expectToHaveSuccessfulTests(runResult, 0);
        expectToHaveFailedTests(runResult, 0);
        expect(runResult.state).to.be.eq(RunState.Complete);
        expect(runResult.errorMessages.length).to.equal(0);
        return true;
      });
    });
  });

  describe('when adding an error file with included: false', () => {

    before(() => {
      const testRunnerOptions = {
        files: [
          { path: 'testResources/sampleProject/src/Add.js', mutated: true, included: true },
          { path: 'testResources/sampleProject/test/AddSpec.js', mutated: false, included: true },
          { path: 'testResources/sampleProject/src/Error.js', mutated: false, included: false }],
        port: 9881,
        strykerOptions: {}
      };
      sut = new KarmaTestRunner(testRunnerOptions);
      return sut.init();
    });

    it('should report Complete without errors', () => {
      return expect(sut.run()).to.eventually.satisfy((runResult: RunResult) => {
        expect(runResult.state).to.be.eq(RunState.Complete);
        return true;
      });
    });
  });

  describe.only('when coverage data is available', () => {

    before(() => {
      const testRunnerOptions: RunnerOptions = {
        files: [
          { path: 'testResources/sampleProject/src-instrumented/Add.js', mutated: true, included: true },
          { path: 'testResources/sampleProject/test/AddSpec.js', mutated: false, included: true }
        ],
        port: 9882,
        strykerOptions: { coverageAnalysis: 'all' }
      };
      sut = new KarmaTestRunner(testRunnerOptions);
      return sut.init();
    });

    it('should report coverage data', () => expect(sut.run()).to.eventually.satisfy((runResult: RunResult) => {
      expect(runResult.coverage).to.be.ok;
      expect(runResult.state).to.be.eq(RunState.Complete);
      const files = Object.keys(runResult.coverage);
      expect(files).to.have.length(1);
      const coverageResult = (runResult.coverage as CoverageCollection)[files[0]];
      expect(coverageResult.s).to.be.ok;
      return true;
    }));
  });
});