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
import Utils from '../../lib/utils';
import LoggerFactory from '../../lib/logger-factory';
import MetaReaderFactory from '../../lib/meta-reader-factory';

describe('Extension - Unit Tests', function () {
    let currentFile: vscode.TextDocument;
    let settings: ExtensionConfig;
    let context: vscode.ExtensionContext;
    let diagCollection: vscode.DiagnosticCollection;
    let getConfigurationStub: sinon.SinonStub;
    let fsStatStub: sinon.SinonStub;
    let runnerFactoryStub: sinon.SinonStub;
    let getIdStub: sinon.SinonStub;

    beforeEach(() => {
        currentFile = generateCurrentFile();
        context = {
            storageUri: vscode.Uri.parse(faker.system.directoryPath()),
            subscriptions: [],
        } as unknown as vscode.ExtensionContext;
        getIdStub = sinon.stub().returns(faker.string.uuid());
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('scan - Unit Tests', function () {
        let scanStub: sinon.SinonStub;

        beforeEach(() => {
            scanStub = sinon.stub().resolves();
            runnerFactoryStub = sinon
                .stub(RunnerFactory, 'getInstance')
                .returns({
                    getId: getIdStub,
                    scan: scanStub,
                } as unknown as RunnerFactory);
        });

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
            fsStatStub = sinon.stub(fs.promises, 'stat').resolves({
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

        it('Should fail to scan a file: undefined settings', async function () {
            const getStub = sinon.stub().returns(undefined);
            getConfigurationStub = sinon
                .stub(vscode.workspace, 'getConfiguration')
                .returns({
                    get: getStub,
                } as unknown as vscode.WorkspaceConfiguration);
            const showErrorMessageStub = sinon
                .stub(vscode.window, 'showErrorMessage')
                .resolves();
            await extension.scan(context, diagCollection, currentFile, true);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(showErrorMessageStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(0);
            expect(getIdStub.callCount).to.be.eql(0);
            expect(scanStub.callCount).to.be.eql(0);
        });

        it('Should fail to scan a file: invalid settings', async function () {
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
            const isSettingsConfiguredStub = sinon
                .stub(Utils, 'isSettingsConfigured')
                .returns(false);
            const showErrorMessageStub = sinon
                .stub(vscode.window, 'showErrorMessage')
                .resolves();
            await extension.scan(context, diagCollection, currentFile, false);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(isSettingsConfiguredStub.callCount).to.be.eql(1);
            expect(showErrorMessageStub.callCount).to.be.eql(0);
            expect(runnerFactoryStub.callCount).to.be.eql(0);
            expect(getIdStub.callCount).to.be.eql(0);
            expect(scanStub.callCount).to.be.eql(0);
        });

        it('Should not scan a folder', async function () {
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
            fsStatStub = sinon.stub(fs.promises, 'stat').resolves({
                isFile: sinon.stub().returns(false),
            } as unknown as fs.Stats);
            await extension.scan(context, diagCollection, currentFile, false);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(fsStatStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(0);
            expect(getIdStub.callCount).to.be.eql(0);
            expect(scanStub.callCount).to.be.eql(0);
        });

        it('Should fail to scan a file: invalid storage', async function () {
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
            fsStatStub = sinon.stub(fs.promises, 'stat').resolves({
                isFile: sinon.stub().returns(true),
            } as unknown as fs.Stats);
            context = {
                storageUri: undefined,
            } as unknown as vscode.ExtensionContext;
            const errorStub = sinon
                .stub(LoggerFactory.getInstance(), 'error')
                .returns();
            const showErrorMessageStub = sinon
                .stub(vscode.window, 'showErrorMessage')
                .resolves();
            await extension.scan(context, diagCollection, currentFile, false);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(fsStatStub.callCount).to.be.eql(1);
            expect(errorStub.callCount).to.be.eql(1);
            expect(showErrorMessageStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(0);
            expect(getIdStub.callCount).to.be.eql(0);
            expect(scanStub.callCount).to.be.eql(0);
        });

        it('Should fail to scan a file: runner throwing an error', async function () {
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
            fsStatStub = sinon.stub(fs.promises, 'stat').resolves({
                isFile: sinon.stub().returns(true),
            } as unknown as fs.Stats);
            const message = 'Failed to scan a file';
            scanStub.onFirstCall().throws(new Error(message));
            const errorStub = sinon
                .stub(LoggerFactory.getInstance(), 'error')
                .returns();
            const showErrorMessageStub = sinon
                .stub(vscode.window, 'showErrorMessage')
                .resolves();
            await extension.scan(context, diagCollection, currentFile, false);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(fsStatStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(1);
            expect(getIdStub.callCount).to.be.eql(1);
            expect(scanStub.callCount).to.be.eql(1);
            expect(errorStub.callCount).to.be.eql(1);
            expect(showErrorMessageStub.callCount).to.be.eql(1);
        });
    });

    describe('addRules - Unit Tests', function () {
        let addRulesStub: sinon.SinonStub;

        beforeEach(() => {
            addRulesStub = sinon.stub().resolves();
            runnerFactoryStub = sinon
                .stub(RunnerFactory, 'getInstance')
                .returns({
                    getId: getIdStub,
                    addRules: addRulesStub,
                } as unknown as RunnerFactory);
        });

        it('Should add rules successfully', async function () {
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
            await extension.addRules();
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(1);
            expect(getIdStub.callCount).to.be.eql(1);
            expect(addRulesStub.callCount).to.be.eql(1);
        });

        it('Should fail to add rules: undefined settings', async function () {
            const getStub = sinon.stub().returns(undefined);
            getConfigurationStub = sinon
                .stub(vscode.workspace, 'getConfiguration')
                .returns({
                    get: getStub,
                } as unknown as vscode.WorkspaceConfiguration);
            const showErrorMessageStub = sinon
                .stub(vscode.window, 'showErrorMessage')
                .resolves();
            await extension.addRules();
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(showErrorMessageStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(0);
            expect(getIdStub.callCount).to.be.eql(0);
            expect(addRulesStub.callCount).to.be.eql(0);
        });

        it('Should fail to add rules: invalid settings', async function () {
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
            const isSettingsConfiguredStub = sinon
                .stub(Utils, 'isSettingsConfigured')
                .returns(false);
            const showErrorMessageStub = sinon
                .stub(vscode.window, 'showErrorMessage')
                .resolves();
            await extension.addRules();
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(isSettingsConfiguredStub.callCount).to.be.eql(1);
            expect(showErrorMessageStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(0);
            expect(getIdStub.callCount).to.be.eql(0);
            expect(addRulesStub.callCount).to.be.eql(0);
        });

        it('Should fail to add rules: runner throwing an error', async function () {
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
            const errorStub = sinon
                .stub(LoggerFactory.getInstance(), 'error')
                .returns();
            const showErrorMessageStub = sinon
                .stub(vscode.window, 'showErrorMessage')
                .resolves();
            addRulesStub.onFirstCall().throws(new Error('Failed to add rules'));
            await extension.addRules();
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(1);
            expect(getIdStub.callCount).to.be.eql(1);
            expect(addRulesStub.callCount).to.be.eql(1);
            expect(errorStub.callCount).to.be.eql(1);
            expect(showErrorMessageStub.callCount).to.be.eql(1);
        });
    });

    describe('scanSelectedFile - Unit Tests', function () {
        it('Should scan the selected file successfully', async function () {
            sinon.stub(vscode.window, 'activeTextEditor').value({
                document: currentFile,
            } as unknown as vscode.TextEditor);
            const callbackStub = sinon.stub().resolves();
            await extension.scanSelectedFile(callbackStub);
            expect(callbackStub.callCount).to.be.eql(1);
        });

        it('Should fail to scan the selected file: no file is selected', async function () {
            sinon.stub(vscode.window, 'activeTextEditor').value({
                document: null,
            } as unknown as vscode.TextEditor);
            const callbackStub = sinon.stub().resolves();
            const showErrorMessageStub = sinon
                .stub(vscode.window, 'showErrorMessage')
                .resolves();
            await extension.scanSelectedFile(callbackStub);
            expect(callbackStub.callCount).to.be.eql(0);
            expect(showErrorMessageStub.callCount).to.be.eql(1);
        });
    });

    describe('activate - Unit Tests', function () {
        let existsSyncStub: sinon.SinonStub;
        let mkdirSyncStub: sinon.SinonStub;
        let getExtensionNameStub: sinon.SinonStub;

        beforeEach(() => {
            getExtensionNameStub = sinon
                .stub(MetaReaderFactory.getInstance(), 'getExtensionName')
                .returns(faker.location.city());
        });

        it('Should activate the extension successfully', async function () {
            const diag = {} as unknown as vscode.DiagnosticCollection;
            existsSyncStub = sinon.stub(fs, 'existsSync').returns(false);
            mkdirSyncStub = sinon.stub(fs, 'mkdirSync').returns(undefined);
            const createDiagnosticCollectionStub = sinon
                .stub(vscode.languages, 'createDiagnosticCollection')
                .returns(diag);
            const showInformationMessageStub = sinon
                .stub(vscode.window, 'showInformationMessage')
                .resolves();
            const registerCommandStub = sinon
                .stub(vscode.commands, 'registerCommand')
                .returns({} as unknown as vscode.Disposable);
            const getExtensionScanCommandStub = sinon.stub(
                MetaReaderFactory.getInstance(),
                'getExtensionScanCommand',
            );
            const getExtensionAddRulesCommandStub = sinon.stub(
                MetaReaderFactory.getInstance(),
                'getExtensionAddRulesCommand',
            );
            await extension.activate(context);
            expect(getExtensionNameStub.callCount).to.be.eql(2);
            expect(existsSyncStub.callCount).to.be.eql(1);
            expect(mkdirSyncStub.callCount).to.be.eql(1);
            expect(createDiagnosticCollectionStub.callCount).to.be.eql(1);
            expect(showInformationMessageStub.callCount).to.be.eql(1);
            expect(registerCommandStub.callCount).to.be.eql(2);
            expect(getExtensionScanCommandStub.callCount).to.be.eql(1);
            expect(getExtensionAddRulesCommandStub.callCount).to.be.eql(1);
            expect(context.subscriptions.length).to.be.eql(4);
        });

        it('Should fail to activate the extension: invalid storage', async function () {
            context = {} as unknown as vscode.ExtensionContext;
            const showErrorMessageStub = sinon
                .stub(vscode.window, 'showErrorMessage')
                .resolves();
            await extension.activate(context);
            expect(showErrorMessageStub.callCount).to.be.eql(1);
        });

        it('Should fail to activate the extension: cannot create storage', async function () {
            const message = 'Failed to create storage directory';
            existsSyncStub = sinon.stub(fs, 'existsSync').returns(false);
            mkdirSyncStub = sinon
                .stub(fs, 'mkdirSync')
                .throws(new Error(message));
            try {
                await extension.activate(context);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(message);
            } finally {
                expect(existsSyncStub.callCount).to.be.eql(1);
                expect(mkdirSyncStub.callCount).to.be.eql(1);
            }
        });
    });

    describe('deactivate - Unit Tests', function () {
        it('Should deactivate the extension successfully', async function () {
            extension.deactivate();
        });
    });
});
