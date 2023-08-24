import { basename, resolve } from 'path';
import { Task, TaskProcessEndEvent, TaskScope, tasks } from 'vscode';

import { faker } from '@faker-js/faker';
import { expect } from 'chai';
import { beforeEach, describe, it } from 'mocha';
import * as sinon from 'sinon';

import { generateRawDiscovery } from './utils';
import {
    TaskUtils,
    cloneObject,
    createHash,
    executeTask,
    isNullOrUndefinedOrEmptyObject,
    isSettingsConfigured,
    parseDiscoveriesCSVFile,
} from '../../lib/utils';
import {
    CredentialDiggerRuntime,
    DbType,
    ExtensionConfig,
} from '../../types/config';
import { State } from '../../types/db';

describe('Utils - Unit Tests', function () {
    afterEach(() => {
        sinon.restore();
    });

    describe('executeTask - Unit Tests', function () {
        let task: Task;

        beforeEach(function () {
            task = new Task(
                {
                    type: faker.person.jobType(),
                    scanId: faker.string.uuid(),
                },
                TaskScope.Workspace,
                faker.person.fullName(),
                faker.system.fileName(),
            );
        });

        it('Should execute task successfully', async function () {
            const taskEndEvent: TaskProcessEndEvent = {
                exitCode: faker.number.int(),
                execution: {
                    task,
                    terminate: () => {
                        return;
                    },
                },
            };
            const executeTaskStub = sinon.stub(tasks, 'executeTask').resolves();
            const getTaskExitCodeStub = sinon
                .stub(TaskUtils, 'getTaskExitCode')
                .withArgs(task)
                .resolves(taskEndEvent.exitCode);

            const result = await executeTask(task);

            expect(result).to.be.equal(taskEndEvent.exitCode);
            expect(executeTaskStub.calledOnce).to.be.true;
            expect(getTaskExitCodeStub.calledOnce).to.be.true;
        });

        it('Should throw an exception when it fails to execute the task', async function () {
            const error = new Error('Failed to start new process');
            const executeTaskStub = sinon
                .stub(tasks, 'executeTask')
                .throws(error);
            const getTaskExitCodeStub = sinon
                .stub(TaskUtils, 'getTaskExitCode')
                .resolves(0);
            try {
                await executeTask(task);
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(error.message);
            } finally {
                expect(executeTaskStub.calledOnce).to.be.true;
                expect(getTaskExitCodeStub.called).to.be.false;
            }
        });

        it('should return undefined when it fails to find the task', async function () {
            const executeTaskStub = sinon.stub(tasks, 'executeTask').resolves();
            const getTaskExitCodeStub = sinon
                .stub(TaskUtils, 'getTaskExitCode')
                .withArgs(task)
                .resolves(undefined);

            const result = await executeTask(task);

            expect(result).to.be.undefined;
            expect(executeTaskStub.calledOnce).to.be.true;
            expect(getTaskExitCodeStub.calledOnce).to.be.true;
        });
    });

    describe('isNullOrUndefinedOrEmptyObject - Unit Tests', function () {
        it('Should return true for null', function () {
            const result = isNullOrUndefinedOrEmptyObject(null);
            expect(result).to.be.true;
        });

        it('Should return true for undefined', function () {
            const result = isNullOrUndefinedOrEmptyObject(undefined);
            expect(result).to.be.true;
        });

        it('Should return true for empty object', function () {
            const result = isNullOrUndefinedOrEmptyObject({});
            expect(result).to.be.true;
        });
    });

    describe('isSettingsConfigured - Unit Tests', function () {
        it('Should return false for empty settings', function () {
            const result = isSettingsConfigured(
                {} as unknown as ExtensionConfig,
            );
            expect(result).to.be.false;
        });

        it('Should return false when the runner is null', function () {
            const result = isSettingsConfigured({
                rules: faker.system.filePath(),
                credentialDiggerRunner: null,
            } as unknown as ExtensionConfig);
            expect(result).to.be.false;
        });

        it('Should return false when only the runner type is provided', function () {
            const result = isSettingsConfigured({
                credentialDiggerRunner: {
                    type: CredentialDiggerRuntime.Binary,
                },
            });
            expect(result).to.be.false;
        });

        it('Should return false when the runner type is provided and all objects are empty', function () {
            const result = isSettingsConfigured({
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
            const result = isSettingsConfigured({
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
            const result = isSettingsConfigured({
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
            const result = isSettingsConfigured({
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
            const result = isSettingsConfigured({
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
            const obj = generateRawDiscovery();
            const result = cloneObject(obj);
            expect(result).to.be.eql(obj);
        });

        it('Should return the object if it is null', function () {
            const obj = null;
            const result = cloneObject(obj);
            expect(result).to.be.eql(obj);
        });
    });

    describe('parseDiscoveriesCSVFile - Unit Tests', function () {
        it('Should parse discoveries csv file successfully', async function () {
            const result = await parseDiscoveriesCSVFile(
                resolve(__dirname, './data/raw-discoveries.csv'),
            );
            expect(result.length).to.be.eql(5);
            result.forEach((d) => {
                expect(d.id).to.be.not.null;
                expect(d.filename).to.be.eql('SMTPEmail.ts');
                expect(d.commitId).to.be.empty;
                expect(d.lineNumber).to.be.greaterThanOrEqual(0);
                expect(d.repoUrl).to.be.not.null;
                expect(basename(d.repoUrl)).to.be.eql(d.filename);
                expect(d.ruleId).to.be.greaterThanOrEqual(1);
                expect(d.state).to.be.eql(State.New);
                expect(d.rule).to.be.not.null;
                expect(d.rule?.id).to.be.eql(d.ruleId);
                expect(d.rule?.regex).to.be.not.null;
                expect(d.rule?.category).to.be.not.null;
                expect(d.rule?.description).to.be.not.null;
            });
        });
    });

    describe('createHash - Unit Tests', function () {
        it('Should create hash successfully', async function () {
            const data = faker.string.alpha(10);
            const length = 4;
            const result = await createHash(data, length);
            expect(result.length).to.be.eql(2 * length);
            expect(result).to.be.not.eql(data);
        });
    });
});
