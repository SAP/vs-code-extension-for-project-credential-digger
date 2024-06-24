import {
    Range,
    Diagnostic,
    DiagnosticCollection,
    DiagnosticSeverity,
    commands,
    CodeAction,
    Uri,
} from 'vscode';

import { faker } from '@faker-js/faker';
import { expect } from 'chai';
import * as sinon from 'sinon';

import { QuickFixProviderSecretStore } from '../../lib/code-actions/quick-fix-provider-secret-store';

describe('QuickFixProviderSecretStore', function () {
    let quickFixProvider: QuickFixProviderSecretStore;
    let diagnosticCollection: DiagnosticCollection;

    beforeEach(() => {
        quickFixProvider = new QuickFixProviderSecretStore(
            diagnosticCollection,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('registerCommands', function () {
        it('should call registerCommand', function () {
            const stub = sinon.stub(commands, 'registerCommand');
            quickFixProvider.registerCommands();

            expect(stub.calledOnce).to.be.true;
        });
    });

    describe('handleDiagnostic', function () {
        it('should push CodeAction even if no secret or more than one secret found', function () {
            const codeActions: CodeAction[] = [];
            const diagnostic: Diagnostic = {
                range: new Range(0, 0, 0, 0),
                message: `Credential detected".\n\nSnippet: "if (username === 'L1l@s' && password === 'L1l@s') {"\n\nRule: "sshpass|password|pwd|passwd|pass[W_]"\n\nCategory: "password"`,
                severity: DiagnosticSeverity.Warning,
                source: 'CredentialDigger',
            };
            const fakeFilePath = faker.system.directoryPath();
            const fakeUri = Uri.file(fakeFilePath);

            quickFixProvider.handleDiagnostic(
                diagnostic,
                new Range(0, 0, 0, 0),
                codeActions,
                fakeUri,
            );
            expect(codeActions.length).to.be.equal(1);
        });

        it('should push new CodeAction if one secret found', function () {
            const codeActions: CodeAction[] = [];
            const diagnostic: Diagnostic = {
                range: new Range(0, 0, 0, 0),
                message: `Credential detected".\n\nSnippet: "password === 'L1l@s';"\n\nRule: "sshpass|password|pwd|passwd|pass[W_]"\n\nCategory: "password"`,
                severity: DiagnosticSeverity.Warning,
                source: 'CredentialDigger',
            };
            const fakeFilePath = faker.system.directoryPath();
            const fakeUri = Uri.file(fakeFilePath);

            quickFixProvider.handleDiagnostic(
                diagnostic,
                new Range(0, 0, 0, 0),
                codeActions,
                fakeUri,
            );
            expect(codeActions.length).to.be.equal(1);
        });
    });
});
