import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import Utils from '../../lib/utils';
import { describe, it, beforeEach } from 'mocha';
import {
    CredentialDiggerRuntime,
    DbType,
    ExtensionConfig,
} from '../../types/config';
import { generateRule } from './utils';

describe('Utils - Unit Tests', function () {
    afterEach(() => {
        sinon.restore();
    });

    describe('executeTask - Unit Tests', function () {
        let task: vscode.Task;

        beforeEach(function () {
            task = new vscode.Task(
                {
                    type: faker.person.jobType(),
                    scanId: faker.string.uuid(),
                },
                vscode.TaskScope.Workspace,
                faker.person.fullName(),
                faker.system.fileName(),
            );
        });

        it('Should execute task successfully', async function () {
            const taskEndEvent: vscode.TaskProcessEndEvent = {
                exitCode: faker.number.int(),
                execution: {
                    task,
                    terminate: () => {
                        return;
                    },
                },
            };
            const executeTaskStub = sinon
                .stub(vscode.tasks, 'executeTask')
                .resolves();
            const getTaskExitCodeStub = sinon
                .stub(Utils, 'getTaskExitCode')
                .withArgs(task)
                .resolves(taskEndEvent.exitCode);

            const result = await Utils.executeTask(task);

            expect(result).to.be.equal(taskEndEvent.exitCode);
            expect(executeTaskStub.calledOnce).to.be.true;
            expect(getTaskExitCodeStub.calledOnce).to.be.true;
        });

        it('Should throw an exception when it fails to execute the task', async function () {
            const error = new Error('Failed to start new process');
            const executeTaskStub = sinon
                .stub(vscode.tasks, 'executeTask')
                .throws(error);
            const getTaskExitCodeStub = sinon
                .stub(Utils, 'getTaskExitCode')
                .resolves(0);
            try {
                await Utils.executeTask(task);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(error.message);
            } finally {
                expect(executeTaskStub.calledOnce).to.be.true;
                expect(getTaskExitCodeStub.called).to.be.false;
            }
        });

        it('should return undefined when it fails to find the task', async function () {
            const executeTaskStub = sinon
                .stub(vscode.tasks, 'executeTask')
                .resolves();
            const getTaskExitCodeStub = sinon
                .stub(Utils, 'getTaskExitCode')
                .withArgs(task)
                .resolves(undefined);

            const result = await Utils.executeTask(task);

            expect(result).to.be.undefined;
            expect(executeTaskStub.calledOnce).to.be.true;
            expect(getTaskExitCodeStub.calledOnce).to.be.true;
        });
    });

    describe('isNullOrUndefinedOrEmptyObject - Unit Tests', function () {
        it('Should return true for null', function () {
            const result = Utils.isNullOrUndefinedOrEmptyObject(null);
            expect(result).to.be.true;
        });

        it('Should return true for undefined', function () {
            const result = Utils.isNullOrUndefinedOrEmptyObject(undefined);
            expect(result).to.be.true;
        });

        it('Should return true for empty object', function () {
            const result = Utils.isNullOrUndefinedOrEmptyObject({});
            expect(result).to.be.true;
        });
    });

    describe('isSettingsConfigured - Unit Tests', function () {
        it('Should return false for empty settings', function () {
            const result = Utils.isSettingsConfigured(
                {} as unknown as ExtensionConfig,
            );
            expect(result).to.be.false;
        });

        it('Should return false when the runner is null', function () {
            const result = Utils.isSettingsConfigured({
                rules: faker.system.filePath(),
                credentialDiggerRunner: null,
            } as unknown as ExtensionConfig);
            expect(result).to.be.false;
        });

        it('Should return false when only the runner type is provided', function () {
            const result = Utils.isSettingsConfigured({
                credentialDiggerRunner: {
                    type: CredentialDiggerRuntime.Binary,
                },
            });
            expect(result).to.be.false;
        });

        it('Should return false when the runner type is provided and all objects are empty', function () {
            const result = Utils.isSettingsConfigured({
                credentialDiggerRunner: {
                    type: CredentialDiggerRuntime.Docker,
                    webserver: {},
                    binary: {},
                    docker: {},
                },
            } as unknown as ExtensionConfig);
            expect(result).to.be.false;
        });

        it('Should return false when all fields are empty', function () {
            const result = Utils.isSettingsConfigured({
                credentialDiggerRunner: {
                    type: '',
                    webserver: {},
                    binary: {},
                    docker: {},
                },
            } as unknown as ExtensionConfig);
            expect(result).to.be.false;
        });

        it('Should return false when the runner type is not provided', function () {
            const result = Utils.isSettingsConfigured({
                credentialDiggerRunner: {
                    webserver: {
                        host: faker.internet.url(),
                        envFile: faker.system.filePath(),
                    },
                },
            } as unknown as ExtensionConfig);
            expect(result).to.be.false;
        });

        it('Should return false when the runner type does not match the object are provided', function () {
            const result = Utils.isSettingsConfigured({
                credentialDiggerRunner: {
                    type: CredentialDiggerRuntime.Binary,
                    webserver: {
                        host: faker.internet.url(),
                        envFile: faker.system.filePath(),
                    },
                },
            });
            expect(result).to.be.false;
        });

        it('Should return true when the runner type & all objects are provided', function () {
            const result = Utils.isSettingsConfigured({
                credentialDiggerRunner: {
                    type: CredentialDiggerRuntime.Binary,
                    binary: {
                        path: faker.system.filePath(),
                        databaseConfig: {
                            type: DbType.SQLite,
                            sqlite: {
                                filename: faker.system.filePath(),
                            },
                        },
                    },
                    webserver: {
                        host: faker.internet.url(),
                        envFile: faker.system.filePath(),
                    },
                    docker: {
                        containerId: faker.git.commitSha(),
                        databaseConfig: {
                            type: DbType.Postgres,
                            postgres: {
                                envFile: faker.system.filePath(),
                            },
                        },
                    },
                },
            });
            expect(result).to.be.true;
        });
    });

    describe('cloneObject - Unit Tests', function () {
        it('Should clone the object successfully', function () {
            const obj = generateRule();
            const result = Utils.cloneObject(obj);
            expect(result).to.be.eql(obj);
        });

        it('Should return the object if it is null', function () {
            const obj = null;
            const result = Utils.cloneObject(obj);
            expect(result).to.be.eql(obj);
        });
    });
});
