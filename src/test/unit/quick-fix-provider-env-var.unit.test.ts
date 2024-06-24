import {
    Range,
    Diagnostic,
    DiagnosticCollection,
    DiagnosticSeverity,
    commands,
    CodeAction,
} from 'vscode';

import { expect } from 'chai';
import * as sinon from 'sinon';

import { QuickFixProviderEnvVar } from '../../lib/code-actions/quick-fix-provider-env-var';

describe('QuickFixProviderEnvVar', function () {
    let quickFixProvider: QuickFixProviderEnvVar;
    let diagnosticCollection: DiagnosticCollection;

    beforeEach(() => {
        quickFixProvider = new QuickFixProviderEnvVar(diagnosticCollection);
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
            quickFixProvider.handleDiagnostic(
                diagnostic,
                new Range(0, 0, 0, 0),
                codeActions,
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
            quickFixProvider.handleDiagnostic(
                diagnostic,
                new Range(0, 0, 0, 0),
                codeActions,
            );
            expect(codeActions.length).to.be.equal(1);
        });
    });
});
