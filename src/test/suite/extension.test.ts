import * as vscode from 'vscode';
import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as extension from '../../extension';
import {
    generateCredentialDiggerRunnerConfig,
    generateCurrentFile,
} from './utils';
import { CredentialDiggerRuntime, ExtensionConfig } from '../../types/config';
import RunnerFactory from '../../lib/runner-factory';
import { faker } from '@faker-js/faker';
import { promisify } from 'util';

const stat = promisify(fs.stat);

describe('Extension - Unit Tests', function () {
    let currentFile: vscode.TextDocument;
    let settings: ExtensionConfig;
    let context: vscode.ExtensionContext;
    let diagCollection: vscode.DiagnosticCollection;
    let getConfigurationStub: sinon.SinonStub;
    let fsStatStub: sinon.SinonStub;
    let runnerFactoryStub: sinon.SinonStub;
    let getIdStub: sinon.SinonStub;
    let scanStub: sinon.SinonStub;

    this.beforeEach(() => {
        currentFile = generateCurrentFile();
        context = {
            storageUri: vscode.Uri.parse(faker.system.directoryPath()),
        } as unknown as vscode.ExtensionContext;
        getIdStub = sinon.stub().returns(faker.string.uuid());
        scanStub = sinon.stub().resolves();
        runnerFactoryStub = sinon.stub(RunnerFactory, 'getInstance').returns({
            getId: getIdStub,
            scan: scanStub,
        } as unknown as RunnerFactory);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('scan - Unit Tests', function () {
        it('Should scan a file successfully', async function () {
            settings = {
                credentialDiggerRunner: generateCredentialDiggerRunnerConfig(
                    CredentialDiggerRuntime.Binary,
                ),
            };
            const getStub = sinon.stub().returns(settings);
            getConfigurationStub = sinon
                .stub(vscode.workspace, 'getConfiguration')
                .returns({
                    get: getStub,
                } as unknown as vscode.WorkspaceConfiguration);
            fsStatStub = sinon
                .stub(fs.promises, 'stat')
                .resolves({
                    isFile: sinon.stub().returns(true),
                } as unknown as fs.Stats);
            await extension.scan(context, diagCollection, currentFile, false);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(fsStatStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(1);
            expect(getIdStub.callCount).to.be.eql(1);
            expect(scanStub.callCount).to.be.eql(1);
        });

        it('Should fail to scan a file: undefined settings', function () {
            //
        });

        it('Should fail to scan a file: invalid settings', function () {
            //
        });

        it('Should not scan a folder', function () {
            //
        });

        it('Should fail to scan a file: invalid storage', function () {
            //
        });

        it('Should fail to scan a file: runner throwing an error', function () {
            //
        });
    });

    describe('addRules - Unit Tests', function () {
        it('Should scan a file successfully', function () {
            //
        });
    });

    describe('activate - Unit Tests', function () {
        it('Should scan a file successfully', function () {
            //
        });
    });
});
