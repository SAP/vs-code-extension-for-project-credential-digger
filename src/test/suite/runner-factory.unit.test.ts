import { faker } from '@faker-js/faker';
import {
    CredentialDiggerRunner,
    CredentialDiggerRunnerBinaryConfig,
    CredentialDiggerRuntime,
    DbConfig,
    DbType,
    SQLiteDbConfig,
} from '../../types/config';
import * as sinon from 'sinon';
import RunnerFactory from '../../lib/runner-factory';
import { expect } from 'chai';
import * as fs from 'fs';
import DockerRunner from '../../lib/client/runner/docker-runner';
import LoggerFactory from '../../lib/logger-factory';
import * as vscode from 'vscode';
import { generateDiscoveries } from './utils';

describe('RunnerFactory  - Unit Tests', function () {
    let runnerConfig: CredentialDiggerRunner;

    afterEach(() => {
        sinon.restore();
    });

    describe('getInstance - Unit Tests', function () {
        it('Should instantiate a docker runner', function () {
            runnerConfig = {
                type: CredentialDiggerRuntime.Docker,
                docker: {
                    containerId: faker.git.commitSha(),
                    databaseConfig: {
                        type: DbType.SQLite,
                        sqlite: {
                            filename: faker.system.filePath(),
                        },
                    },
                },
            };
            const result = RunnerFactory.getInstance(runnerConfig);
            expect(result).to.be.not.null;
            expect(result.getId()).to.be.not.empty.string;
        });

        it('Should instantiate a webserver runner', function () {
            runnerConfig = {
                type: CredentialDiggerRuntime.WebServer,
                webserver: {
                    host: faker.internet.url(),
                },
            };
            const result = RunnerFactory.getInstance(runnerConfig);
            expect(result).to.be.not.null;
            expect(result.getId()).to.be.not.empty.string;
        });

        it('Should instantiate a binary runner', function () {
            runnerConfig = {
                type: CredentialDiggerRuntime.Binary,
                binary: {
                    path: faker.system.filePath(),
                    databaseConfig: {
                        type: DbType.Postgres,
                    },
                },
            };
            const fsExistsSyncStub = sinon.stub(fs, 'existsSync').returns(true);
            const result = RunnerFactory.getInstance(runnerConfig);
            expect(result).to.be.not.null;
            expect(result.getId()).to.be.not.empty.string;
            expect(fsExistsSyncStub.callCount).to.be.eql(1);
        });

        it('Should fail to instantiate a runner with a known type but empty configuration', function () {
            const errMessage =
                'Please provide the Credential Digger configuration';
            runnerConfig = {
                type: CredentialDiggerRuntime.Binary,
            };

            try {
                RunnerFactory.getInstance(runnerConfig);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(errMessage);
            }
        });

        it('Should fail to instantiate a runner with unknown type', function () {
            const errMessage = 'Failed to instantiate a command runner';
            runnerConfig = {
                type: faker.string.sample(10),
            } as unknown as CredentialDiggerRunner;

            try {
                RunnerFactory.getInstance(runnerConfig);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(errMessage);
            }
        });

        it('Should fail to instantiate a runner with unknown database type', function () {
            const errMessage = 'Please provide a valid database type';
            runnerConfig = {
                type: CredentialDiggerRuntime.Docker,
                docker: {
                    containerId: faker.git.commitSha(),
                    databaseConfig: {
                        type: faker.database.type(),
                    } as unknown as DbConfig,
                },
            };
            try {
                RunnerFactory.getInstance(runnerConfig);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(errMessage);
            }
        });

        it('Should fail to instantiate a runner without database config', function () {
            const errMessage =
                'Please provide the Credential Digger database configuration';
            runnerConfig = {
                type: CredentialDiggerRuntime.Binary,
                binary: {
                    path: faker.system.filePath(),
                } as unknown as CredentialDiggerRunnerBinaryConfig,
            };
            const fsExistsSyncStub = sinon.stub(fs, 'existsSync').returns(true);
            try {
                RunnerFactory.getInstance(runnerConfig);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(errMessage);
            } finally {
                expect(fsExistsSyncStub.callCount).to.be.eql(0);
            }
        });

        it('Should fail to instantiate a runner without sqlite database config', function () {
            const errMessage =
                'Please provide the Credential Digger SQLite database configuration';
            runnerConfig = {
                type: CredentialDiggerRuntime.Binary,
                binary: {
                    path: faker.system.filePath(),
                    databaseConfig: {
                        type: DbType.SQLite,
                    },
                },
            };
            const fsExistsSyncStub = sinon.stub(fs, 'existsSync').returns(true);
            try {
                RunnerFactory.getInstance(runnerConfig);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(errMessage);
            } finally {
                expect(fsExistsSyncStub.callCount).to.be.eql(0);
            }
        });

        it('Should fail to instantiate a runner without sqlite database file config', function () {
            const errMessage =
                'Please provide the Credential Digger SQLite database location';
            runnerConfig = {
                type: CredentialDiggerRuntime.Binary,
                binary: {
                    path: faker.system.filePath(),
                    databaseConfig: {
                        type: DbType.SQLite,
                        sqlite: {} as unknown as SQLiteDbConfig,
                    },
                },
            };
            const fsExistsSyncStub = sinon.stub(fs, 'existsSync').returns(true);
            try {
                RunnerFactory.getInstance(runnerConfig);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(errMessage);
            } finally {
                expect(fsExistsSyncStub.callCount).to.be.eql(0);
            }
        });

        it('Should fail to instantiate a docker runner: missing containerId', function () {
            const errMessage = 'Please provide a containerId';
            runnerConfig = {
                type: CredentialDiggerRuntime.Docker,
                docker: {
                    databaseConfig: {
                        type: DbType.Postgres,
                    },
                },
            } as unknown as CredentialDiggerRunner;
            try {
                RunnerFactory.getInstance(runnerConfig);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(errMessage);
            }
        });

        it('Should fail to instantiate a binary runner: missing binary path', function () {
            const errMessage = 'Please provide the Credential Digger location';
            runnerConfig = {
                type: CredentialDiggerRuntime.Binary,
                binary: {
                    databaseConfig: {
                        type: DbType.Postgres,
                    },
                },
            } as unknown as CredentialDiggerRunner;
            try {
                RunnerFactory.getInstance(runnerConfig);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(errMessage);
            }
        });

        it('Should fail to instantiate a binary runner: non existing binary path', function () {
            const errMessage =
                'Please provide a valid Credential Digger location';
            runnerConfig = {
                type: CredentialDiggerRuntime.Binary,
                binary: {
                    path: faker.system.filePath(),
                    databaseConfig: {
                        type: DbType.Postgres,
                    },
                },
            };
            const fsExistsSyncStub = sinon
                .stub(fs, 'existsSync')
                .returns(false);
            try {
                RunnerFactory.getInstance(runnerConfig);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(errMessage);
            } finally {
                expect(fsExistsSyncStub.callCount).to.be.eql(1);
            }
        });

        it('Should fail to instantiate a webserver runner: empty config', function () {
            const errMessage =
                'Please provide the URL of the Credential Digger Webserver';
            runnerConfig = {
                type: CredentialDiggerRuntime.WebServer,
                webserver: {
                    host: '',
                },
            };
            try {
                RunnerFactory.getInstance(runnerConfig);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(errMessage);
            }
        });

        it('Should fail to instantiate a webserver runner: invalid host', function () {
            const errMessage =
                'Please provide a valid URL of the Credential Digger Webserver';
            runnerConfig = {
                type: CredentialDiggerRuntime.WebServer,
                webserver: {
                    host: faker.system.filePath(),
                },
            };
            try {
                RunnerFactory.getInstance(runnerConfig);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(errMessage);
            }
        });

        it('Should fail to instantiate a webserver runner: non-existing envFile', function () {
            const errMessage =
                'Please provide a valid Credential File location';
            runnerConfig = {
                type: CredentialDiggerRuntime.WebServer,
                webserver: {
                    host: faker.internet.url(),
                    envFile: faker.system.filePath(),
                },
            };
            try {
                RunnerFactory.getInstance(runnerConfig);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(errMessage);
            }
        });
    });

    describe('addRules - Unit Tests', function () {
        beforeEach(() => {
            runnerConfig = {
                type: CredentialDiggerRuntime.Docker,
                docker: {
                    containerId: faker.git.commitSha(),
                    databaseConfig: {
                        type: DbType.SQLite,
                        sqlite: {
                            filename: faker.system.filePath(),
                        },
                    },
                },
            };
        });

        it('Should successfully add rules', async function () {
            const runnerAddRulesStub = sinon
                .stub(DockerRunner.prototype, 'addRules')
                .resolves(true);
            const debugStub = sinon
                .stub(LoggerFactory.getInstance(), 'debug')
                .resolves();
            const showInformationMessageStub = sinon
                .stub(vscode.window, 'showInformationMessage')
                .resolves();
            const rules = faker.system.filePath();
            await RunnerFactory.getInstance(runnerConfig).addRules(rules);
            expect(runnerAddRulesStub.callCount).to.be.eql(1);
            expect(debugStub.callCount).to.be.eql(2);
            expect(showInformationMessageStub.callCount).to.be.eql(1);
        });

        it('Should fail to add rules', async function () {
            const runnerAddRulesStub = sinon
                .stub(DockerRunner.prototype, 'addRules')
                .resolves(false);
            const debugStub = sinon
                .stub(LoggerFactory.getInstance(), 'debug')
                .resolves();
            const showErrorMessageStub = sinon
                .stub(vscode.window, 'showErrorMessage')
                .resolves();
            const rules = faker.system.filePath();
            await RunnerFactory.getInstance(runnerConfig).addRules(rules);
            expect(runnerAddRulesStub.callCount).to.be.eql(1);
            expect(debugStub.callCount).to.be.eql(2);
            expect(showErrorMessageStub.callCount).to.be.eql(1);
        });

        it('Should raise exception when adding rules', async function () {
            const error = new Error('Failed to add rules');
            const runnerAddRulesStub = sinon
                .stub(DockerRunner.prototype, 'addRules')
                .throws(error);
            const debugStub = sinon
                .stub(LoggerFactory.getInstance(), 'debug')
                .resolves();
            const showInformationMessageStub = sinon
                .stub(vscode.window, 'showInformationMessage')
                .resolves();
            const showErrorMessageStub = sinon
                .stub(vscode.window, 'showErrorMessage')
                .resolves();
            const rules = faker.system.filePath();
            try {
                await RunnerFactory.getInstance(runnerConfig).addRules(rules);
            } catch (err) {
                expect(err).not.to.be.null;
                expect(err).to.be.eql(error);
            } finally {
                expect(runnerAddRulesStub.callCount).to.be.eql(1);
                expect(debugStub.callCount).to.be.eql(1);
                expect(showInformationMessageStub.callCount).to.be.eql(0);
                expect(showErrorMessageStub.callCount).to.be.eql(0);
            }
        });
    });

    describe('scan - Unit Tests', function () {
        let currentFile: vscode.TextDocument;
        let storageUri: vscode.Uri;
        let diagCollection: vscode.DiagnosticCollection;

        beforeEach(() => {
            runnerConfig = {
                type: CredentialDiggerRuntime.Docker,
                docker: {
                    containerId: faker.git.commitSha(),
                    databaseConfig: {
                        type: DbType.SQLite,
                        sqlite: {
                            filename: faker.system.filePath(),
                        },
                    },
                },
            };
            currentFile = {
                uri: {
                    fspath: faker.system.filePath(),
                },
                lineAt: (line: number) => {
                    return {
                        text: faker.string.sample((line + 1) * 2),
                    };
                },
            } as unknown as vscode.TextDocument;

            storageUri = faker.system.filePath() as unknown as vscode.Uri;
            diagCollection = {
                delete: () => true,
                set: () => true,
            } as unknown as vscode.DiagnosticCollection;
        });

        it('Should successfully scan a file: 0 findings', async function () {
            const debugStub = sinon
                .stub(LoggerFactory.getInstance(), 'debug')
                .resolves();
            const runnerScanStub = sinon
                .stub(DockerRunner.prototype, 'scan')
                .resolves(0);
            const runnerGetDiscoveriesStub = sinon
                .stub(DockerRunner.prototype, 'getDiscoveries')
                .resolves();
            1;
            const runnerCleanupStub = sinon
                .stub(DockerRunner.prototype, 'cleanup')
                .resolves();
            await RunnerFactory.getInstance(runnerConfig).scan(
                currentFile,
                storageUri,
                diagCollection,
            );
            expect(debugStub.callCount).to.be.eql(2);
            expect(runnerScanStub.callCount).to.be.eql(1);
            expect(runnerGetDiscoveriesStub.callCount).to.be.eql(0);
            expect(runnerCleanupStub.callCount).to.be.eql(1);
        });

        it('Should successfully scan a file: at least one finding', async function () {
            const discoveries = generateDiscoveries(2);
            currentFile = {
                uri: {
                    fspath: faker.system.filePath(),
                },
                lineAt: (line: number) => {
                    return {
                        text:
                            faker.lorem.sentence() +
                            discoveries[line].snippet +
                            faker.lorem.sentence(),
                    };
                },
            } as unknown as vscode.TextDocument;
            const debugStub = sinon
                .stub(LoggerFactory.getInstance(), 'debug')
                .resolves();
            const runnerScanStub = sinon
                .stub(DockerRunner.prototype, 'scan')
                .resolves(discoveries.length);
            const runnerGetDiscoveriesStub = sinon
                .stub(DockerRunner.prototype, 'getDiscoveries')
                .resolves(discoveries);
            const runnerCleanupStub = sinon
                .stub(DockerRunner.prototype, 'cleanup')
                .resolves();
            await RunnerFactory.getInstance(runnerConfig).scan(
                currentFile,
                storageUri,
                diagCollection,
            );
            expect(debugStub.callCount).to.be.eql(2);
            expect(runnerScanStub.callCount).to.be.eql(1);
            expect(runnerGetDiscoveriesStub.callCount).to.be.eql(1);
            expect(runnerCleanupStub.callCount).to.be.eql(1);
        });
    });
});
