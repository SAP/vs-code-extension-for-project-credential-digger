import fs from 'fs';
import { extname } from 'path';
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
    cleanUp,
    deactivate,
    getFilterPattern,
    isIgnored,
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

    before(() => {
        workspace.updateWorkspaceFolders(0, 0, {
            uri: Uri.parse(faker.system.directoryPath()),
            name: faker.system.directoryPath(),
        });
    });

    after(() => {
        workspace.updateWorkspaceFolders(0, 1);
    });

    beforeEach(() => {
        currentFile = generateCurrentFile();
        context = {
            storageUri: Uri.parse(faker.system.directoryPath()),
            subscriptions: [],
        } as unknown as ExtensionContext;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('scan - Unit Tests', function () {
        let fPattern: string[];
        let scanStub: sinon.SinonStub;

        beforeEach(() => {
            fPattern = [];
            scanStub = sinon.stub().resolves();
            runnerFactoryStub = sinon
                .stub(RunnerFactory, 'getInstance')
                .returns({
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
            await scan(context, diagCollection, currentFile, fPattern, false);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(fsStatStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(1);
            expect(scanStub.callCount).to.be.eql(1);
        });

        it('Should not scan a file: file ignored', async function () {
            fPattern = [`*${extname(currentFile.uri.fsPath)}`];
            getConfigurationStub = sinon
                .stub(workspace, 'getConfiguration')
                .returns({} as unknown as WorkspaceConfiguration);
            await scan(context, diagCollection, currentFile, fPattern, true);
            expect(getConfigurationStub.callCount).to.be.eql(0);
            expect(runnerFactoryStub.callCount).to.be.eql(0);
            expect(scanStub.callCount).to.be.eql(0);
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
            const loggerInstanceStub = sinon
                .stub(LoggerFactory, 'getInstance')
                .returns({ error: errorStub } as unknown as LoggerFactory);
            await scan(context, diagCollection, currentFile, fPattern, true);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(showErrorMessageStub.callCount).to.be.eql(1);
            expect(loggerInstanceStub.callCount).to.be.eql(1);
            expect(errorStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(0);
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
            const loggerInstanceStub = sinon
                .stub(LoggerFactory, 'getInstance')
                .returns({ error: errorStub } as unknown as LoggerFactory);
            await scan(context, diagCollection, currentFile, fPattern, false);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(isSettingsConfiguredStub.callCount).to.be.eql(1);
            expect(showErrorMessageStub.callCount).to.be.eql(0);
            expect(loggerInstanceStub.callCount).to.be.eql(1);
            expect(errorStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(0);
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
            await scan(context, diagCollection, currentFile, fPattern, false);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(fsStatStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(0);
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
            const loggerInstanceStub = sinon
                .stub(LoggerFactory, 'getInstance')
                .returns({ error: errorStub } as unknown as LoggerFactory);
            const showErrorMessageStub = sinon
                .stub(window, 'showErrorMessage')
                .resolves();
            await scan(context, diagCollection, currentFile, fPattern, false);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(fsStatStub.callCount).to.be.eql(1);
            expect(loggerInstanceStub.callCount).to.be.eql(1);
            expect(errorStub.callCount).to.be.eql(1);
            expect(showErrorMessageStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(0);
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
            const loggerInstanceStub = sinon
                .stub(LoggerFactory, 'getInstance')
                .returns({ error: errorStub } as unknown as LoggerFactory);
            const showErrorMessageStub = sinon
                .stub(window, 'showErrorMessage')
                .resolves();
            await scan(context, diagCollection, currentFile, fPattern, false);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(fsStatStub.callCount).to.be.eql(1);
            expect(runnerFactoryStub.callCount).to.be.eql(1);
            expect(scanStub.callCount).to.be.eql(1);
            expect(loggerInstanceStub.callCount).to.be.eql(1);
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
            const loggerInstanceStub = sinon
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
            expect(addRulesStub.callCount).to.be.eql(1);
            expect(loggerInstanceStub.callCount).to.be.eql(1);
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
            const warnStub = sinon.stub().returns(undefined);
            const loggerInstanceStub = sinon
                .stub(LoggerFactory, 'getInstance')
                .returns({ warn: warnStub } as unknown as LoggerFactory);
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
            expect(loggerInstanceStub.callCount).to.be.eql(1);
            expect(warnStub.callCount).to.be.eql(1);
            // expect(registerCommandStub.callCount).to.be.eql(2);
            expect(registerCommandStub.callCount).to.be.eql(5); // + 3 quick fix added
            expect(getExtensionScanCommandStub.callCount).to.be.eql(1);
            expect(getExtensionAddRulesCommandStub.callCount).to.be.eql(1);
            // expect(context.subscriptions.length).to.be.eql(6);
            expect(context.subscriptions.length).to.be.eql(12); // + 6 more subscription for the quick fix added
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

    describe('cleanUp - Unit Tests', function () {
        let deleteStub: sinon.SinonStub;

        beforeEach(() => {
            deleteStub = sinon.stub().returns(null);
            diagCollection = {
                delete: deleteStub,
            } as unknown as DiagnosticCollection;
        });

        it('Should execute cleanup successfully', async function () {
            cleanUp(currentFile, diagCollection);
            expect(deleteStub.callCount).to.be.eql(1);
        });
    });

    describe('deactivate - Unit Tests', function () {
        it('Should deactivate the extension successfully', async function () {
            deactivate();
        });
    });

    describe('getFilterPattern - Unit Tests', function () {
        let result: string[];
        let affectsConfigurationStub: sinon.SinonStub;
        let getStub: sinon.SinonStub;
        let loggerInstanceStub: sinon.SinonStub;
        let warnStub: sinon.SinonStub;

        beforeEach(() => {
            affectsConfigurationStub = sinon.stub().returns(true);
            getStub = sinon.stub().returns(undefined);
            getConfigurationStub = sinon
                .stub(workspace, 'getConfiguration')
                .returns({
                    get: getStub,
                } as unknown as WorkspaceConfiguration);
            warnStub = sinon.stub().returns(undefined);
            loggerInstanceStub = sinon
                .stub(LoggerFactory, 'getInstance')
                .returns({ warn: warnStub } as unknown as LoggerFactory);
        });

        it('Should getFilterPattern from settings', async function () {
            const expected = { filterPattern: ['/node_modules/'] };
            getStub.onCall(0).returns(expected);
            result = getFilterPattern(
                {
                    affectsConfiguration: affectsConfigurationStub,
                },
                ['test'],
            );
            expect(affectsConfigurationStub.callCount).to.be.eql(1);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(loggerInstanceStub.callCount).to.be.eql(1);
            expect(warnStub.callCount).to.be.eql(1);
            expect(result).to.be.eql(expected.filterPattern);
        });

        it('Should return [] when settings are unset', async function () {
            const expected = { rules: faker.system.filePath() };
            getStub.onCall(0).returns(expected);
            result = getFilterPattern(
                {
                    affectsConfiguration: affectsConfigurationStub,
                },
                ['test'],
            );
            expect(affectsConfigurationStub.callCount).to.be.eql(1);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(loggerInstanceStub.callCount).to.be.eql(1);
            expect(warnStub.callCount).to.be.eql(1);
            expect(result).to.be.eql([]);
        });

        it('Should return [] when filter pattern is unset', async function () {
            result = getFilterPattern(
                {
                    affectsConfiguration: affectsConfigurationStub,
                },
                ['test'],
            );
            expect(affectsConfigurationStub.callCount).to.be.eql(1);
            expect(getConfigurationStub.callCount).to.be.eql(1);
            expect(getStub.callCount).to.be.eql(1);
            expect(loggerInstanceStub.callCount).to.be.eql(1);
            expect(warnStub.callCount).to.be.eql(1);
            expect(result).to.be.eql([]);
        });

        it('Should return existing pattern when settings are not affected', async function () {
            const expected = ['test'];
            affectsConfigurationStub.onCall(0).returns(false);
            result = getFilterPattern(
                {
                    affectsConfiguration: affectsConfigurationStub,
                },
                expected,
            );
            expect(affectsConfigurationStub.callCount).to.be.eql(1);
            expect(getConfigurationStub.callCount).to.be.eql(0);
            expect(getStub.callCount).to.be.eql(0);
            expect(loggerInstanceStub.callCount).to.be.eql(0);
            expect(warnStub.callCount).to.be.eql(0);
            expect(result).to.be.eql(expected);
        });
    });

    describe('isIgnored - Unit Tests', function () {
        const fPattern = [
            'node_modules',
            'test',
            '*.jar',
            'out',
            'dist',
            '**/*.map',
            'coverage',
            'resources',
            '*.gif',
        ];

        it('Should ignore files', function () {
            const files = [
                'node_modules/clone/clone.js',
                'src/test/extension.unit.test.ts',
                './dist/extension.js',
                'out/extension.js.map',
                'coverage/index.html',
                'images/credential-digger-local.gif',
                '/etc/resources/logo-CD',
            ];
            files.forEach((f) => {
                const r = isIgnored(f, fPattern);
                expect(r).to.be.true;
            });
        });

        it('Should not ignore files', function () {
            const files = ['src/extension.ts', 'src/lib/utils.ts', 'README.md'];
            files.forEach((f) => {
                const r = isIgnored(f, fPattern);
                expect(r).to.be.false;
            });
        });
    });
});
