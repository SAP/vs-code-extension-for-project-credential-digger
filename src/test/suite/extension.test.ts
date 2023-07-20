import * as vscode from 'vscode';

import { describe, it } from 'mocha';
import { expect } from 'chai';

describe('Extension Test Suite', function () {
    vscode.window.showInformationMessage('Start all tests.');

    it('Sample test', function () {
        expect(1).to.be.equal(1);
    });
});
