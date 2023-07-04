// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';
import { describe, it } from 'mocha';
import { expect } from 'chai';

describe('Extension Test Suite', function () {
    vscode.window.showInformationMessage('Start all tests.');

    it('Sample test', function () {
        expect(1).to.be.equal(1);
    });
});
