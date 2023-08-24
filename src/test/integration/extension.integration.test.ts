import * as assert from 'assert';
import { window } from 'vscode';

describe('Extension - Integration Tests', function () {
    window.showInformationMessage('Start all tests.');
    it('Sample test', function () {
        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
        assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    });
});
