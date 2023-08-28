import * as fs from 'fs';
import * as vscode from 'vscode';

import { faker } from '@faker-js/faker';
import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import * as sinon from 'sinon';

import BinaryRunner from '../../../../lib/client/runner/binary-runner';
import LoggerFactory from '../../../../lib/logger-factory';
import * as Utils from '../../../../lib/utils';
import {
    CredentialDiggerRunnerBinaryConfig,
    CredentialDiggerRuntime,
    DbType,
} from '../../../../types/config';
import { Discovery } from '../../../../types/db';
import {
    generateCredentialDiggerRunnerConfig,
    generateCurrentFile,
    generateDBConfig,
    generateDiscoveries,
} from '../../utils';

describe('BinaryRunner  - Unit Tests', function () {
    let currentFile: vscode.TextDocument;
    let config: CredentialDiggerRunnerBinaryConfig;
    let discoveries: Discovery[];
    let runner: BinaryRunner;
    let loggerInstance: sinon.SinonStub;
    let debugStub: sinon.SinonStub;
    let existsSyncStub: sinon.SinonStub;
    let cmdShellExecStub: sinon.SinonStub;
    let executeTaskStub: sinon.SinonStub;
    let taskStub: sinon.SinonStub;

    beforeEach(() => {
        discoveries = generateDiscoveries(2);
        currentFile = generateCurrentFile(discoveries);
        existsSyncStub = sinon.stub(fs, 'existsSync').resolves(true);
        debugStub = sinon.stub().returns(undefined);
        loggerInstance = sinon
            .stub(LoggerFactory, 'getInstance')
            .returns({ debug: debugStub } as unknown as LoggerFactory);
        cmdShellExecStub = sinon.stub(vscode, 'ShellExecution').returns({});
        taskStub = sinon.stub(vscode, 'Task').returns({});
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('scan - Unit Tests', function () {
        let result: number;

        it('Should successfully scan a file: sqlite db', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                generateDBConfig(DbType.SQLite),
            ).binary as CredentialDiggerRunnerBinaryConfig;
            executeTaskStub = sinon
                .stub(Utils, 'executeTask')
                .resolves(discoveries.length);
            runner = new BinaryRunner(config, CredentialDiggerRuntime.Binary);
            runner.setCurrentFile(currentFile);
            result = await runner.scan();
            const expectedCmd = `${config.path} scan_path "${currentFile.uri.fsPath}" --models PathModel --force --debug --sqlite "${config.databaseConfig.sqlite?.filename}"`;
            expect(existsSyncStub.called).to.be.true;
            expect(loggerInstance.callCount).to.be.eql(2);
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(cmdShellExecStub.lastCall.args[0]).to.be.eql(expectedCmd);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(result).to.be.eql(discoveries.length);
        });

        it('Should successfully scan a file: postgres db', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                generateDBConfig(DbType.Postgres),
            ).binary as CredentialDiggerRunnerBinaryConfig;
            executeTaskStub = sinon
                .stub(Utils, 'executeTask')
                .resolves(discoveries.length);
            runner = new BinaryRunner(config, CredentialDiggerRuntime.Binary);
            runner.setCurrentFile(currentFile);
            result = await runner.scan();
            const expectedCmd = `${config.path} scan_path "${currentFile.uri.fsPath}" --models PathModel --force --debug`;
            expect(existsSyncStub.called).to.be.true;
            expect(loggerInstance.callCount).to.be.eql(2);
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(cmdShellExecStub.lastCall.args[0]).to.be.eql(expectedCmd);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(result).to.be.eql(discoveries.length);
        });

        it('Should fail to scan a file', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                generateDBConfig(DbType.SQLite),
            ).binary as CredentialDiggerRunnerBinaryConfig;
            executeTaskStub = sinon
                .stub(Utils, 'executeTask')
                .resolves(undefined);
            runner = new BinaryRunner(config, CredentialDiggerRuntime.Binary);
            runner.setCurrentFile(currentFile);
            result = await runner.scan();
            expect(existsSyncStub.called).to.be.true;
            expect(loggerInstance.callCount).to.be.eql(2);
            expect(debugStub.callCount).to.be.eql(2);
            expect(debugStub.lastCall.args[0]).to.be.eql(
                `${runner.getId()}: scan: exit code: ${undefined}`,
            );
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(result).to.be.eql(0);
        });

        it('Should fail to scan a file: exception is raised', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                generateDBConfig(DbType.SQLite),
            ).binary as CredentialDiggerRunnerBinaryConfig;
            const message = 'Failed to execute task';
            executeTaskStub = sinon
                .stub(Utils, 'executeTask')
                .throws(new Error(message));
            try {
                runner = new BinaryRunner(
                    config,
                    CredentialDiggerRuntime.Binary,
                );
                runner.setCurrentFile(currentFile);
                await runner.scan();
            } catch (e) {
                expect(e).to.be.not.null;
                expect((e as Error).message).to.be.eql(message);
            } finally {
                expect(existsSyncStub.called).to.be.true;
                expect(loggerInstance.callCount).to.be.eql(1);
                expect(debugStub.callCount).to.be.eql(1);
                expect(cmdShellExecStub.callCount).to.be.eql(1);
                expect(taskStub.callCount).to.be.eql(1);
                expect(executeTaskStub.callCount).to.be.eql(1);
            }
        });
    });

    describe('getDiscoveries - Unit Tests', function () {
        let result: Discovery[];
        let storagePath: vscode.Uri;
        let discoveriesFileLocation: vscode.Uri;
        let parseDiscoveriesCSVFileStub: sinon.SinonStub;
        let createHashStub: sinon.SinonStub;

        beforeEach(() => {
            storagePath = vscode.Uri.parse(faker.system.filePath());
            parseDiscoveriesCSVFileStub = sinon
                .stub(Utils, 'parseDiscoveriesCSVFile')
                .resolves(discoveries);
            const filename = faker.system.fileName();
            createHashStub = sinon.stub(Utils, 'createHash').returns(filename);
            discoveriesFileLocation = vscode.Uri.joinPath(
                storagePath,
                filename + '.csv',
            );
        });

        it('Should successfully get discoveries: sqlite db', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                generateDBConfig(DbType.SQLite),
            ).binary as CredentialDiggerRunnerBinaryConfig;
            executeTaskStub = sinon
                .stub(Utils, 'executeTask')
                .resolves(discoveries.length);
            runner = new BinaryRunner(config, CredentialDiggerRuntime.Binary);
            runner.setCurrentFile(currentFile);
            result = await runner.getDiscoveries(storagePath);
            const expectedCmd = `${config.path} get_discoveries --with_rules --save "${discoveriesFileLocation.fsPath}" "${currentFile.uri.fsPath}" --sqlite "${config.databaseConfig.sqlite?.filename}"`;
            expect(createHashStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(2);
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(cmdShellExecStub.lastCall.args[0]).to.be.eql(expectedCmd);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(parseDiscoveriesCSVFileStub.callCount).to.be.eql(1);
            expect(result).to.be.eql(discoveries);
            // Cleanup
            const rmStub = sinon.stub(fs, 'rmSync').returns();
            await runner.cleanup();
            expect(rmStub.callCount).to.be.eql(1);
        });

        it('Should successfully get discoveries: postgres db', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                generateDBConfig(DbType.Postgres),
            ).binary as CredentialDiggerRunnerBinaryConfig;
            executeTaskStub = sinon
                .stub(Utils, 'executeTask')
                .resolves(discoveries.length);
            runner = new BinaryRunner(config, CredentialDiggerRuntime.Binary);
            runner.setCurrentFile(currentFile);
            result = await runner.getDiscoveries(storagePath);
            const expectedCmd = `${config.path} get_discoveries --with_rules --save "${discoveriesFileLocation.fsPath}" "${currentFile.uri.fsPath}"`;
            expect(createHashStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(2);
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(cmdShellExecStub.lastCall.args[0]).to.be.eql(expectedCmd);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(parseDiscoveriesCSVFileStub.callCount).to.be.eql(1);
            expect(result).to.be.eql(discoveries);
        });

        it('Should find 0 discoveries', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                generateDBConfig(DbType.Postgres),
            ).binary as CredentialDiggerRunnerBinaryConfig;
            executeTaskStub = sinon.stub(Utils, 'executeTask').resolves(0);
            runner = new BinaryRunner(config, CredentialDiggerRuntime.Binary);
            runner.setCurrentFile(currentFile);
            result = await runner.getDiscoveries(storagePath);
            expect(createHashStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(2);
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(parseDiscoveriesCSVFileStub.callCount).to.be.eql(0);
            expect(result).to.be.eql([]);
        });

        it('Should fail to get discoveries: non-existing file location', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                generateDBConfig(DbType.SQLite),
            ).binary as CredentialDiggerRunnerBinaryConfig;
            runner = new BinaryRunner(config, CredentialDiggerRuntime.Binary);
            result = await runner.getDiscoveries(storagePath);
            expect(createHashStub.callCount).to.be.eql(0);
            expect(loggerInstance.callCount).to.be.eql(0);
            expect(debugStub.callCount).to.be.eql(0);
            expect(cmdShellExecStub.callCount).to.be.eql(0);
            expect(taskStub.callCount).to.be.eql(0);
            expect(parseDiscoveriesCSVFileStub.callCount).to.be.eql(0);
            expect(result).to.be.eql([]);
        });
    });

    describe('addRules - Unit Tests', function () {
        let result: boolean;
        let rulesFileLocation: string;

        beforeEach(() => {
            rulesFileLocation = faker.system.filePath();
        });

        it('Should successfully add rules: sqlite db', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                generateDBConfig(DbType.SQLite),
            ).binary as CredentialDiggerRunnerBinaryConfig;
            executeTaskStub = sinon.stub(Utils, 'executeTask').resolves(0);
            runner = new BinaryRunner(config, CredentialDiggerRuntime.Binary);
            runner.validateAndSetRules(rulesFileLocation);
            result = await runner.addRules();
            const expectedCmd = `${config.path} add_rules "${
                vscode.Uri.parse(rulesFileLocation).fsPath
            }" --sqlite "${config.databaseConfig.sqlite?.filename}"`;
            expect(loggerInstance.callCount).to.be.eql(2);
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(cmdShellExecStub.lastCall.args[0]).to.be.eql(expectedCmd);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(result).to.be.true;
        });

        it('Should successfully add rules: postgres db', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                generateDBConfig(DbType.Postgres),
            ).binary as CredentialDiggerRunnerBinaryConfig;
            executeTaskStub = sinon.stub(Utils, 'executeTask').resolves(0);
            runner = new BinaryRunner(config, CredentialDiggerRuntime.Binary);
            runner.validateAndSetRules(rulesFileLocation);
            result = await runner.addRules();
            const expectedCmd = `${config.path} add_rules "${
                vscode.Uri.parse(rulesFileLocation).fsPath
            }" --dotenv "${config.databaseConfig.postgres?.envFile}"`;
            expect(loggerInstance.callCount).to.be.eql(2);
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(cmdShellExecStub.lastCall.args[0]).to.be.eql(expectedCmd);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(result).to.be.true;
        });

        it('Should fail to add rules: non-zero exit code', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                generateDBConfig(DbType.SQLite),
            ).binary as CredentialDiggerRunnerBinaryConfig;
            executeTaskStub = sinon.stub(Utils, 'executeTask').resolves(-9);
            runner = new BinaryRunner(config, CredentialDiggerRuntime.Binary);
            runner.validateAndSetRules(rulesFileLocation);
            result = await runner.addRules();
            expect(loggerInstance.callCount).to.be.eql(2);
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(result).to.be.false;
        });

        it('Should fail to add rules: rules are not set', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                generateDBConfig(DbType.SQLite),
            ).binary as CredentialDiggerRunnerBinaryConfig;
            runner = new BinaryRunner(config, CredentialDiggerRuntime.Binary);
            result = await runner.addRules();
            expect(loggerInstance.callCount).to.be.eql(0);
            expect(debugStub.callCount).to.be.eql(0);
            expect(cmdShellExecStub.callCount).to.be.eql(0);
            expect(taskStub.callCount).to.be.eql(0);
            expect(result).to.be.false;
        });

        it('Should fail to add rules: rules file path is undefined', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                generateDBConfig(DbType.SQLite),
            ).binary as CredentialDiggerRunnerBinaryConfig;
            const message = 'Please provide the path to the rules file';
            runner = new BinaryRunner(config, CredentialDiggerRuntime.Binary);
            try {
                runner.validateAndSetRules('');
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(message);
            } finally {
                expect(loggerInstance.callCount).to.be.eql(0);
                expect(debugStub.callCount).to.be.eql(0);
                expect(cmdShellExecStub.callCount).to.be.eql(0);
                expect(taskStub.callCount).to.be.eql(0);
            }
        });

        it('Should fail to add rules: postgres db config is undefined', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                { type: DbType.Postgres },
            ).binary as CredentialDiggerRunnerBinaryConfig;
            const message =
                'Please provide the Credential Digger Postgres database configuration';
            runner = new BinaryRunner(config, CredentialDiggerRuntime.Binary);
            try {
                runner.validateAndSetRules(rulesFileLocation);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(message);
            } finally {
                expect(loggerInstance.callCount).to.be.eql(0);
                expect(debugStub.callCount).to.be.eql(0);
                expect(cmdShellExecStub.callCount).to.be.eql(0);
                expect(taskStub.callCount).to.be.eql(0);
            }
        });

        it('Should fail to add rules: postgres db config is invalid', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                { type: DbType.Postgres, postgres: { envFile: '' } },
            ).binary as CredentialDiggerRunnerBinaryConfig;
            const message =
                'Please provide the Credential Digger Postgres database environment file';
            runner = new BinaryRunner(config, CredentialDiggerRuntime.Binary);
            try {
                runner.validateAndSetRules(rulesFileLocation);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(message);
            } finally {
                expect(loggerInstance.callCount).to.be.eql(0);
                expect(debugStub.callCount).to.be.eql(0);
                expect(cmdShellExecStub.callCount).to.be.eql(0);
                expect(taskStub.callCount).to.be.eql(0);
            }
        });
    });

    describe('cleanup - Unit Tests', function () {
        it('Should successfully cleanup', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Binary,
                generateDBConfig(DbType.SQLite),
            ).binary as CredentialDiggerRunnerBinaryConfig;
            runner = new BinaryRunner(config, CredentialDiggerRuntime.Binary);
            await runner.cleanup();
        });
    });
});
