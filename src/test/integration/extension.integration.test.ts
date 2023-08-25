import { window } from 'vscode';

import { expect } from 'chai';

describe('Extension - Integration Tests', function () {
    window.showInformationMessage('Start integration tests.');
    it('Sample test', function () {
        expect([1, 2, 3].indexOf(5)).to.be.eql(-1);
        expect([1, 2, 3].indexOf(0)).to.be.eql(-1);
    });
});
