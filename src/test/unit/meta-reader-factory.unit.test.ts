import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';

import MetaReaderFactory from '../../lib/meta-reader-factory';

describe('MetaReaderFactory - Unit Tests', function () {
    afterEach(() => {
        sinon.restore();
    });

    describe('getExtensionName - Unit Tests', function () {
        it('Should return extension name', async function () {
            const expected = 'vs-code-extension-for-project-credential-digger';
            const result = MetaReaderFactory.getInstance().getExtensionName();
            expect(result).to.be.eql(expected);
        });
    });

    describe('getExtensionScanCommand - Unit Tests', function () {
        it('Should return scan command name', async function () {
            const expected =
                'vs-code-extension-for-project-credential-digger.credentialDiggerScan';
            const result =
                MetaReaderFactory.getInstance().getExtensionScanCommand();
            expect(result).to.be.eql(expected);
        });
    });

    describe('getExtensionAddRulesCommand - Unit Tests', function () {
        it('Should return addRules command name', async function () {
            const expected =
                'vs-code-extension-for-project-credential-digger.credentialDiggerAddRules';
            const result =
                MetaReaderFactory.getInstance().getExtensionAddRulesCommand();
            expect(result).to.be.eql(expected);
        });
    });
});
