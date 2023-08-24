import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { describe, it, beforeEach, afterEach } from 'mocha';
import {
    CredentialDiggerRunnerDockerConfig,
    CredentialDiggerRuntime,
    DbType,
} from '../../../../types/config';
import DockerRunner from '../../../../lib/client/runner/docker-runner';
import { Discovery } from '../../../../types/db';
import {
    generateCredentialDiggerRunnerConfig,
    generateCurrentFile,
    generateDBConfig,
    generateDiscoveries,
} from '../../utils';
import LoggerFactory from '../../../../lib/logger-factory';
import Utils from '../../../../lib/utils';
import { dirname } from 'path';
import { promises } from 'fs';

describe('DockerRunner  - Unit Tests', function () {
    const containerWorkingDir = '/data/credentialDigger';
    let currentFile: vscode.TextDocument;
    let config: CredentialDiggerRunnerDockerConfig;
    let fileLocation: vscode.Uri;
    let discoveries: Discovery[];
    let runner: DockerRunner;
    let debugStub: sinon.SinonStub;
    let cmdShellExecStub: sinon.SinonStub;
    let executeTaskStub: sinon.SinonStub;
    let taskStub: sinon.SinonStub;

    beforeEach(() => {
        discoveries = generateDiscoveries(2);
        currentFile = generateCurrentFile(discoveries);
        fileLocation = vscode.Uri.joinPath(
            vscode.Uri.parse(containerWorkingDir),
            currentFile.uri.fsPath,
        );
        debugStub = sinon.stub(LoggerFactory.getInstance(), 'debug').resolves();
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
                CredentialDiggerRuntime.Docker,
                generateDBConfig(DbType.SQLite),
            ).docker as CredentialDiggerRunnerDockerConfig;
            executeTaskStub = sinon
                .stub(Utils, 'executeTask')
                .resolves(discoveries.length);
            runner = new DockerRunner(config, CredentialDiggerRuntime.Docker);
            runner.setCurrentFile(currentFile);
            result = await runner.scan();
            const expectedCmd = `docker exec "${
                config.containerId
            }" mkdir -p "${dirname(fileLocation.fsPath)}" && docker cp "${
                currentFile.uri.fsPath
            }" "${config.containerId}:${fileLocation.fsPath}" && docker exec "${
                config.containerId
            }" credentialdigger scan_path "${
                fileLocation.fsPath
            }" --models PathModel --force --debug --sqlite "${
                config.databaseConfig.sqlite?.filename
            }"`;
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(cmdShellExecStub.lastCall.args[0]).to.be.eql(expectedCmd);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(result).to.be.eql(discoveries.length);
        });

        it('Should successfully scan a file: postgres db', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Docker,
                generateDBConfig(DbType.Postgres),
            ).docker as CredentialDiggerRunnerDockerConfig;
            executeTaskStub = sinon
                .stub(Utils, 'executeTask')
                .resolves(discoveries.length);
            runner = new DockerRunner(config, CredentialDiggerRuntime.Docker);
            runner.setCurrentFile(currentFile);
            result = await runner.scan();
            const expectedCmd = `docker exec "${
                config.containerId
            }" mkdir -p "${dirname(fileLocation.fsPath)}" && docker cp "${
                currentFile.uri.fsPath
            }" "${config.containerId}:${fileLocation.fsPath}" && docker exec "${
                config.containerId
            }" credentialdigger scan_path "${
                fileLocation.fsPath
            }" --models PathModel --force --debug`;
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(cmdShellExecStub.lastCall.args[0]).to.be.eql(expectedCmd);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(result).to.be.eql(discoveries.length);
        });

        it('Should fail to scan a file: exit code command does not exist', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Docker,
                generateDBConfig(DbType.SQLite),
            ).docker as CredentialDiggerRunnerDockerConfig;
            const exitCode = 127;
            executeTaskStub = sinon
                .stub(Utils, 'executeTask')
                .resolves(exitCode);
            runner = new DockerRunner(config, CredentialDiggerRuntime.Docker);
            runner.setCurrentFile(currentFile);
            result = await runner.scan();
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(result).to.be.eql(-exitCode);
        });
    });

    describe('getDiscoveries - Unit Tests', function () {
        let result: Discovery[];
        let storagePath: vscode.Uri;
        let discoveriesFileLocation: vscode.Uri;
        let discoveriesLocalFileLocation: vscode.Uri;
        let parseDiscoveriesCSVFileStub: sinon.SinonStub;
        let createHashStub: sinon.SinonStub;

        beforeEach(() => {
            storagePath = vscode.Uri.parse(faker.system.filePath());
            parseDiscoveriesCSVFileStub = sinon
                .stub(Utils, 'parseDiscoveriesCSVFile')
                .resolves(discoveries);
            const filename = faker.system.fileName();
            createHashStub = sinon.stub(Utils, 'createHash').resolves(filename);
            discoveriesLocalFileLocation = vscode.Uri.joinPath(
                storagePath,
                filename + '.csv',
            );
            discoveriesFileLocation = vscode.Uri.joinPath(
                vscode.Uri.parse(containerWorkingDir),
                filename + '.csv',
            );
        });

        it('Should successfully get discoveries: sqlite db', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Docker,
                generateDBConfig(DbType.SQLite),
            ).docker as CredentialDiggerRunnerDockerConfig;
            executeTaskStub = sinon.stub(Utils, 'executeTask').resolves(0);
            runner = new DockerRunner(config, CredentialDiggerRuntime.Docker);
            runner.setCurrentFile(currentFile);
            result = await runner.getDiscoveries(storagePath);
            let expectedCmd = `docker exec "${config.containerId}" credentialdigger get_discoveries --with_rules --save "${discoveriesFileLocation.fsPath}" "${fileLocation.fsPath}" --sqlite "${config.databaseConfig.sqlite?.filename}"; docker cp "${config.containerId}:${discoveriesFileLocation.fsPath}" "${discoveriesLocalFileLocation.fsPath}"`;
            expect(createHashStub.callCount).to.be.eql(1);
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(cmdShellExecStub.lastCall.args[0]).to.be.eql(expectedCmd);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(parseDiscoveriesCSVFileStub.callCount).to.be.eql(1);
            expect(result).to.be.eql(discoveries);
            // Cleanup
            const rmStub = sinon.stub(promises, 'rm').resolves();
            await runner.cleanup();
            expectedCmd = `docker exec "${config.containerId}" rm -f "${fileLocation.fsPath}"; docker exec "${config.containerId}" rm -f "${discoveriesFileLocation.fsPath}"`;
            expect(debugStub.callCount).to.be.eql(3);
            expect(cmdShellExecStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.lastCall.args[0]).to.be.eql(expectedCmd);
            expect(taskStub.callCount).to.be.eql(2);
            expect(executeTaskStub.callCount).to.be.eql(2);
            expect(rmStub.callCount).to.be.eql(1);
        });

        it('Should successfully get discoveries: postgres db', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Docker,
                generateDBConfig(DbType.Postgres),
            ).docker as CredentialDiggerRunnerDockerConfig;
            executeTaskStub = sinon.stub(Utils, 'executeTask').resolves(0);
            runner = new DockerRunner(config, CredentialDiggerRuntime.Docker);
            runner.setCurrentFile(currentFile);
            result = await runner.getDiscoveries(storagePath);
            const expectedCmd = `docker exec "${config.containerId}" credentialdigger get_discoveries --with_rules --save "${discoveriesFileLocation.fsPath}" "${fileLocation.fsPath}"; docker cp "${config.containerId}:${discoveriesFileLocation.fsPath}" "${discoveriesLocalFileLocation.fsPath}"`;
            expect(createHashStub.callCount).to.be.eql(1);
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
                CredentialDiggerRuntime.Docker,
                generateDBConfig(DbType.Postgres),
            ).docker as CredentialDiggerRunnerDockerConfig;
            executeTaskStub = sinon.stub(Utils, 'executeTask').resolves(1);
            runner = new DockerRunner(config, CredentialDiggerRuntime.Docker);
            runner.setCurrentFile(currentFile);
            result = await runner.getDiscoveries(storagePath);
            expect(createHashStub.callCount).to.be.eql(1);
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(parseDiscoveriesCSVFileStub.callCount).to.be.eql(0);
            expect(result).to.be.eql([]);
        });

        it('Should fail to get discoveries: non-existing file location', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Docker,
                generateDBConfig(DbType.SQLite),
            ).docker as CredentialDiggerRunnerDockerConfig;
            runner = new DockerRunner(config, CredentialDiggerRuntime.Docker);
            result = await runner.getDiscoveries(storagePath);
            expect(createHashStub.callCount).to.be.eql(0);
            expect(debugStub.callCount).to.be.eql(0);
            expect(cmdShellExecStub.callCount).to.be.eql(0);
            expect(taskStub.callCount).to.be.eql(0);
            expect(parseDiscoveriesCSVFileStub.callCount).to.be.eql(0);
            expect(result).to.be.eql([]);
        });
    });

    describe('addRules - Unit Tests', function () {
        let result: boolean;
        let rulesPath: string;
        let rules: vscode.Uri;
        let rulesFileLocation: vscode.Uri;

        beforeEach(() => {
            rulesPath = faker.system.filePath();
            rules = vscode.Uri.parse(rulesPath);
            rulesFileLocation = vscode.Uri.joinPath(
                vscode.Uri.parse(containerWorkingDir),
                rules.fsPath,
            );
        });

        it('Should successfully add rules: sqlite db', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Docker,
                generateDBConfig(DbType.SQLite),
            ).docker as CredentialDiggerRunnerDockerConfig;
            executeTaskStub = sinon.stub(Utils, 'executeTask').resolves(0);
            runner = new DockerRunner(config, CredentialDiggerRuntime.Docker);
            runner.validateAndSetRules(rulesPath);
            result = await runner.addRules();
            const expectedCmd = `docker exec "${
                config.containerId
            }" mkdir -p "${dirname(rulesFileLocation.fsPath)}" && docker cp "${
                rules.fsPath
            }" "${config.containerId}:${
                rulesFileLocation.fsPath
            }" && docker exec "${
                config.containerId
            }" credentialdigger add_rules "${
                rulesFileLocation.fsPath
            }" --sqlite "${config.databaseConfig.sqlite?.filename}"`;
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(cmdShellExecStub.lastCall.args[0]).to.be.eql(expectedCmd);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(result).to.be.true;
        });

        it('Should successfully add rules: postgres db', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Docker,
                generateDBConfig(DbType.Postgres),
            ).docker as CredentialDiggerRunnerDockerConfig;
            executeTaskStub = sinon.stub(Utils, 'executeTask').resolves(0);
            runner = new DockerRunner(config, CredentialDiggerRuntime.Docker);
            runner.validateAndSetRules(rulesPath);
            result = await runner.addRules();
            const expectedCmd = `docker exec "${
                config.containerId
            }" mkdir -p "${dirname(rulesFileLocation.fsPath)}" && docker cp "${
                rules.fsPath
            }" "${config.containerId}:${
                rulesFileLocation.fsPath
            }" && docker exec "${
                config.containerId
            }" credentialdigger add_rules "${
                rulesFileLocation.fsPath
            }" --dotenv "${config.databaseConfig.postgres?.envFile}"`;
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(cmdShellExecStub.lastCall.args[0]).to.be.eql(expectedCmd);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(result).to.be.true;
        });

        it('Should fail to add rules: non-zero exit code', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Docker,
                generateDBConfig(DbType.SQLite),
            ).docker as CredentialDiggerRunnerDockerConfig;
            executeTaskStub = sinon.stub(Utils, 'executeTask').resolves(-9);
            runner = new DockerRunner(config, CredentialDiggerRuntime.Docker);
            runner.validateAndSetRules(rulesPath);
            result = await runner.addRules();
            expect(debugStub.callCount).to.be.eql(2);
            expect(cmdShellExecStub.callCount).to.be.eql(1);
            expect(taskStub.callCount).to.be.eql(1);
            expect(executeTaskStub.callCount).to.be.eql(1);
            expect(result).to.be.false;
        });

        it('Should fail to add rules: rules are not set', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.Docker,
                generateDBConfig(DbType.SQLite),
            ).docker as CredentialDiggerRunnerDockerConfig;
            runner = new DockerRunner(config, CredentialDiggerRuntime.Docker);
            result = await runner.addRules();
            expect(debugStub.callCount).to.be.eql(0);
            expect(cmdShellExecStub.callCount).to.be.eql(0);
            expect(taskStub.callCount).to.be.eql(0);
            expect(result).to.be.false;
        });
    });
});
