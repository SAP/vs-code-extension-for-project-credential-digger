import fs from 'fs';
import {
    DiagnosticCollection,
    Disposable,
    ExtensionContext,
    TextDocument,
    TextEditor,
    Uri,
    WorkspaceConfiguration,
    commands,
    languages,
    window,
    workspace,
} from 'vscode';

import { faker } from '@faker-js/faker';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';

import {
    generateCredentialDiggerRunnerConfig,
    generateCurrentFile,
} from './utils';
import {
    activate,
    addRules,
    deactivate,
    scan,
    scanSelectedFile,
} from '../../extension';
import LoggerFactory from '../../lib/logger-factory';
import MetaReaderFactory from '../../lib/meta-reader-factory';
import RunnerFactory from '../../lib/runner-factory';
import * as Utils from '../../lib/utils';
import { CredentialDiggerRuntime, ExtensionConfig } from '../../types/config';

describe('Extension - Unit Tests', function () {
    let currentFile: TextDocument;
    let settings: ExtensionConfig;
    let context: ExtensionContext;
    let diagCollection: DiagnosticCollection;
    let getConfigurationStub: sinon.SinonStub;
    let fsStatStub: sinon.SinonStub;
    let runnerFactoryStub: sinon.SinonStub;
    let getIdStub: sinon.SinonStub;

    beforeEach(() => {
        currentFile = generateCurrentFile();
        context = {
            storageUri: Uri.parse(faker.system.directoryPath()),
            subscriptions: [],
        } as unknown as ExtensionContext;
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
                .stub(workspace, 'getConfiguration')
                .returns({
                    get: getStub,
                } as unknown as WorkspaceConfiguration);
            fsStatStub = sinon.stub(fs, 'statSync').returns({
                isFile: sinon.stub().returns(true),
            } as unknown as fs.Stats);
            await scan(context, diagCollection, currentFile, false);
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
                .stub(workspace, 'getConfiguration')
                .returns({
                    get: getStub,
                } as unknown as WorkspaceConfiguration);
            const showErrorMessageStub = sinon
                .stub(window, 'showErrorMessage')
                .resolves();
            const errorStub = sinon.stub().returns(undefined);
            const loggerInstance = sinon
                .stub(LoggerFactory, 'getInstance')
                .returns({ error: errorStub } as unknown as LoggerFactory);
            await scan(context, diagCollection, currentFile, true);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(showErrorMessageStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(1);
            expect(errorStub.callCount).to.be.eql(1);
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
                .stub(workspace, 'getConfiguration')
                .returns({
                    get: getStub,
                } as unknown as WorkspaceConfiguration);
            const isSettingsConfiguredStub = sinon
                .stub(Utils, 'isSettingsConfigured')
                .returns(false);
            const showErrorMessageStub = sinon
                .stub(window, 'showErrorMessage')
                .resolves();
            const errorStub = sinon.stub().returns(undefined);
            const loggerInstance = sinon
                .stub(LoggerFactory, 'getInstance')
                .returns({ error: errorStub } as unknown as LoggerFactory);
            await scan(context, diagCollection, currentFile, false);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(isSettingsConfiguredStub.callCount).to.be.eql(1);
            expect(showErrorMessageStub.callCount).to.be.eql(0);
            expect(loggerInstance.callCount).to.be.eql(1);
            expect(errorStub.callCount).to.be.eql(1);
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
                .stub(workspace, 'getConfiguration')
                .returns({
                    get: getStub,
                } as unknown as WorkspaceConfiguration);
            fsStatStub = sinon.stub(fs, 'statSync').returns({
                isFile: sinon.stub().returns(false),
            } as unknown as fs.Stats);
            await scan(context, diagCollection, currentFile, false);
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
                .stub(workspace, 'getConfiguration')
                .returns({
                    get: getStub,
                } as unknown as WorkspaceConfiguration);
            fsStatStub = sinon.stub(fs, 'statSync').returns({
                isFile: sinon.stub().returns(true),
            } as unknown as fs.Stats);
            context = {
                storageUri: undefined,
            } as unknown as ExtensionContext;
            const errorStub = sinon.stub().returns(undefined);
            const loggerInstance = sinon
                .stub(LoggerFactory, 'getInstance')
                .returns({ error: errorStub } as unknown as LoggerFactory);
            const showErrorMessageStub = sinon
                .stub(window, 'showErrorMessage')
                .resolves();
            await scan(context, diagCollection, currentFile, false);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(fsStatStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(1);
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
                .stub(workspace, 'getConfiguration')
                .returns({
                    get: getStub,
                } as unknown as WorkspaceConfiguration);
            fsStatStub = sinon.stub(fs, 'statSync').returns({
                isFile: sinon.stub().returns(true),
            } as unknown as fs.Stats);
            const message = 'Failed to scan a file';
            scanStub.onFirstCall().throws(new Error(message));
            const errorStub = sinon.stub().returns(undefined);
            const loggerInstance = sinon
                .stub(LoggerFactory, 'getInstance')
                .returns({ error: errorStub } as unknown as LoggerFactory);
            const showErrorMessageStub = sinon
                .stub(window, 'showErrorMessage')
                .resolves();
            await scan(context, diagCollection, currentFile, false);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(fsStatStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(1);
            expect(getIdStub.callCount).to.be.eql(1);
            expect(scanStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(1);
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
                .stub(workspace, 'getConfiguration')
                .returns({
                    get: getStub,
                } as unknown as WorkspaceConfiguration);
            await addRules();
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(1);
            expect(getIdStub.callCount).to.be.eql(1);
            expect(addRulesStub.callCount).to.be.eql(1);
        });

        it('Should fail to add rules: undefined settings', async function () {
            const getStub = sinon.stub().returns(undefined);
            getConfigurationStub = sinon
                .stub(workspace, 'getConfiguration')
                .returns({
                    get: getStub,
                } as unknown as WorkspaceConfiguration);
            const showErrorMessageStub = sinon
                .stub(window, 'showErrorMessage')
                .resolves();
            await addRules();
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
                .stub(workspace, 'getConfiguration')
                .returns({
                    get: getStub,
                } as unknown as WorkspaceConfiguration);
            const isSettingsConfiguredStub = sinon
                .stub(Utils, 'isSettingsConfigured')
                .returns(false);
            const showErrorMessageStub = sinon
                .stub(window, 'showErrorMessage')
                .resolves();
            await addRules();
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
                .stub(workspace, 'getConfiguration')
                .returns({
                    get: getStub,
                } as unknown as WorkspaceConfiguration);
            const errorStub = sinon.stub().returns(undefined);
            const loggerInstance = sinon
                .stub(LoggerFactory, 'getInstance')
                .returns({ error: errorStub } as unknown as LoggerFactory);
            const showErrorMessageStub = sinon
                .stub(window, 'showErrorMessage')
                .resolves();
            addRulesStub.onFirstCall().throws(new Error('Failed to add rules'));
            await addRules();
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(1);
            expect(getIdStub.callCount).to.be.eql(1);
            expect(addRulesStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(1);
            expect(errorStub.callCount).to.be.eql(1);
            expect(showErrorMessageStub.callCount).to.be.eql(1);
        });
    });

    describe('scanSelectedFile - Unit Tests', function () {
        it('Should scan the selected file successfully', async function () {
            sinon.stub(window, 'activeTextEditor').value({
                document: currentFile,
            } as unknown as TextEditor);
            const callbackStub = sinon.stub().resolves();
            await scanSelectedFile(callbackStub);
            expect(callbackStub.callCount).to.be.eql(1);
        });

        it('Should fail to scan the selected file: no file is selected', async function () {
            sinon.stub(window, 'activeTextEditor').value({
                document: null,
            } as unknown as TextEditor);
            const callbackStub = sinon.stub().resolves();
            const showErrorMessageStub = sinon
                .stub(window, 'showErrorMessage')
                .resolves();
            await scanSelectedFile(callbackStub);
            expect(callbackStub.callCount).to.be.eql(0);
            expect(showErrorMessageStub.callCount).to.be.eql(1);
        });
    });

    describe('activate - Unit Tests', function () {
        let existsSyncStub: sinon.SinonStub;
        let mkdirSyncStub: sinon.SinonStub;
        let getExtensionDisplayNameStub: sinon.SinonStub;

        beforeEach(() => {
            getExtensionDisplayNameStub = sinon
                .stub(
                    MetaReaderFactory.getInstance(),
                    'getExtensionDisplayName',
                )
                .returns(faker.location.city());
        });

        it('Should activate the extension successfully', async function () {
            const diag = {} as unknown as DiagnosticCollection;
            existsSyncStub = sinon.stub(fs, 'existsSync').returns(false);
            mkdirSyncStub = sinon.stub(fs, 'mkdirSync').returns(undefined);
            const createDiagnosticCollectionStub = sinon
                .stub(languages, 'createDiagnosticCollection')
                .returns(diag);
            const showInformationMessageStub = sinon
                .stub(window, 'showInformationMessage')
                .resolves();
            const registerCommandStub = sinon
                .stub(commands, 'registerCommand')
                .returns({} as unknown as Disposable);
            const getExtensionScanCommandStub = sinon.stub(
                MetaReaderFactory.getInstance(),
                'getExtensionScanCommand',
            );
            const getExtensionAddRulesCommandStub = sinon.stub(
                MetaReaderFactory.getInstance(),
                'getExtensionAddRulesCommand',
            );
            await activate(context);
            expect(getExtensionDisplayNameStub.callCount).to.be.eql(2);
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
            context = {} as unknown as ExtensionContext;
            const showErrorMessageStub = sinon
                .stub(window, 'showErrorMessage')
                .resolves();
            await activate(context);
            expect(showErrorMessageStub.callCount).to.be.eql(1);
        });

        it('Should fail to activate the extension: cannot create storage', async function () {
            const message = 'Failed to create storage directory';
            existsSyncStub = sinon.stub(fs, 'existsSync').returns(false);
            mkdirSyncStub = sinon
                .stub(fs, 'mkdirSync')
                .throws(new Error(message));
            try {
                await activate(context);
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
            deactivate();
        });
    });
});
