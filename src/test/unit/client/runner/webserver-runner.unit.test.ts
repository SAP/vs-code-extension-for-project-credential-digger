import fs from 'fs';
import { TextDocument } from 'vscode';

import { faker } from '@faker-js/faker';
import axios, {
    AxiosError,
    AxiosInstance,
    AxiosResponse,
    HttpStatusCode,
    isAxiosError,
} from 'axios';
import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import * as sinon from 'sinon';

import WebServerRunner from '../../../../lib/client/runner/webserver-runner';
import LoggerFactory from '../../../../lib/logger-factory';
import { convertRawToDiscovery, generateUniqUuid } from '../../../../lib/utils';
import {
    CredentialDiggerRunnerWebServerConfig,
    CredentialDiggerRuntime,
} from '../../../../types/config';
import { Discovery, RawDiscovery } from '../../../../types/db';
import {
    generateCredentialDiggerRunnerConfig,
    generateCurrentFile,
    generateRawDiscoveries,
} from '../../utils';

describe('WebserverRunner  - Unit Tests', function () {
    let currentFile: TextDocument;
    let config: CredentialDiggerRunnerWebServerConfig;
    let rawDiscoveries: RawDiscovery[];
    let runner: WebServerRunner;
    let axiosInstanceStub: sinon.SinonStub;
    let postStub: sinon.SinonStub;
    let loggerInstance: sinon.SinonStub;
    let debugStub: sinon.SinonStub;
    let warnStub: sinon.SinonStub;

    beforeEach(() => {
        rawDiscoveries = generateRawDiscoveries(2);
        currentFile = generateCurrentFile(rawDiscoveries);
        debugStub = sinon.stub().returns(undefined);
        warnStub = sinon.stub().returns(undefined);
        loggerInstance = sinon.stub(LoggerFactory, 'getInstance').returns({
            debug: debugStub,
            warn: warnStub,
        } as unknown as LoggerFactory);
        postStub = sinon.stub().resolves();
        axiosInstanceStub = sinon.stub(axios, 'create').returns({
            post: postStub,
        } as unknown as AxiosInstance);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('scan - Unit Tests', function () {
        let result: number;

        beforeEach(() => {
            const postResponse = {
                status: HttpStatusCode.Ok,
                headers: {
                    'content-type': 'application/json',
                },
                data: rawDiscoveries,
            };
            postStub.onCall(0).resolves(postResponse);
        });

        it('Should successfully scan a file: secure mode disabled', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            delete config.envFile;
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            runner.setCurrentFile(currentFile);
            result = await runner.scan();
            expect(axiosInstanceStub.callCount).to.be.eql(1);
            expect(postStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(3);
            expect(debugStub.callCount).to.be.eql(3);
            expect(result).to.be.eql(rawDiscoveries.length);
        });

        it('Should successfully scan a file: secure mode enabled', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            const connectStub = sinon
                .stub(WebServerRunner.prototype, 'connect')
                .resolves();
            const existsSyncStub = sinon.stub(fs, 'existsSync').resolves(true);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            runner.setCurrentFile(currentFile);
            result = await runner.scan();
            expect(existsSyncStub.callCount).to.be.eql(1);
            expect(axiosInstanceStub.callCount).to.be.eql(1);
            expect(connectStub.callCount).to.be.eql(1);
            expect(postStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(3);
            expect(debugStub.callCount).to.be.eql(3);
            expect(result).to.be.eql(rawDiscoveries.length);
        });

        it('Should successfully scan a file: certificate validation is set', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            delete config.envFile;
            config.host = faker.internet.url({ protocol: 'https' });
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            runner.setCurrentFile(currentFile);
            result = await runner.scan();
            const message = `Certificate validation flag is set to ${config.certificateValidation}`;
            expect(warnStub.callCount).to.be.eql(1);
            expect(warnStub.lastCall.args[0]).to.be.eql(message);
            expect(axiosInstanceStub.callCount).to.be.eql(1);
            expect(postStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(4);
            expect(debugStub.callCount).to.be.eql(3);
            expect(result).to.be.eql(rawDiscoveries.length);
        });

        it('Should successfully scan a file: certificate validation is not set defaults to true', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            delete config.envFile;
            delete config.certificateValidation;
            config.host = faker.internet.url({ protocol: 'https' });
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            runner.setCurrentFile(currentFile);
            result = await runner.scan();
            const message = `Certificate validation flag is not set defaulting to true`;
            expect(warnStub.callCount).to.be.eql(1);
            expect(warnStub.lastCall.args[0]).to.be.eql(message);
            expect(axiosInstanceStub.callCount).to.be.eql(1);
            expect(postStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(4);
            expect(debugStub.callCount).to.be.eql(3);
            expect(result).to.be.eql(rawDiscoveries.length);
        });

        it('Should successfully scan a file: 0 discoveries', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            delete config.envFile;
            const postResponse = {
                status: HttpStatusCode.Ok,
                headers: {
                    'content-type': 'application/json',
                },
                data: [],
            };
            postStub.onCall(0).resolves(postResponse);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            runner.setCurrentFile(currentFile);
            result = await runner.scan();
            expect(axiosInstanceStub.callCount).to.be.eql(1);
            expect(postStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(3);
            expect(debugStub.callCount).to.be.eql(3);
            expect(result).to.be.eql(0);
        });

        it('Should fail to scan a file', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            delete config.envFile;
            const postResponse = {
                status: HttpStatusCode.Unauthorized,
                headers: {
                    'content-type': 'application/json',
                },
                data: rawDiscoveries,
            };
            postStub.onCall(0).resolves(postResponse);
            const message = `Failed to scan file ${currentFile.uri.fsPath} on ${config.host}`;
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            runner.setCurrentFile(currentFile);
            try {
                result = await runner.scan();
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(message);
            } finally {
                expect(axiosInstanceStub.callCount).to.be.eql(1);
                expect(postStub.callCount).to.be.eql(1);
                expect(debugStub.callCount).to.be.eql(2);
            }
        });
    });

    describe('getDiscoveries - Unit Tests', function () {
        let result: Discovery[];

        it('Should successfully get discoveries', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            delete config.envFile;
            const postResponse = {
                status: HttpStatusCode.Ok,
                headers: {
                    'content-type': 'application/json',
                },
                data: rawDiscoveries,
            };
            postStub.onCall(0).resolves(postResponse);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            runner.setCurrentFile(currentFile);
            const count = await runner.scan();
            result = await runner.getDiscoveries();
            const discoveries: Discovery[] = [];
            rawDiscoveries.forEach((r) => {
                const d = convertRawToDiscovery(r, true);
                if (d) {
                    discoveries.push(d);
                }
            });
            expect(axiosInstanceStub.callCount).to.be.eql(1);
            expect(postStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(3);
            expect(debugStub.callCount).to.be.eql(3);
            expect(count).to.be.eql(rawDiscoveries.length);
            expect(result).to.be.eql(discoveries);
        });
    });

    describe('addRules - Unit Tests', function () {
        let result: boolean;
        let rules: string;

        beforeEach(() => {
            rules = faker.system.filePath();
        });

        it('Should successfully add rules: secure mode disabled', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            delete config.envFile;
            const postResponse = {
                status: HttpStatusCode.Found,
            } as unknown as AxiosResponse;
            const axiosError = new AxiosError(
                'Rules added successfully',
                undefined,
                undefined,
                undefined,
                postResponse,
            );
            postStub.onCall(0).throws(axiosError);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            runner.validateAndSetRules(rules);
            result = await runner.addRules();
            expect(axiosInstanceStub.callCount).to.be.eql(1);
            expect(postStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(2);
            expect(debugStub.callCount).to.be.eql(2);
            expect(result).to.be.eql(true);
        });

        it('Should successfully add rules: secure mode enabled', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            const postResponse = {
                status: HttpStatusCode.Found,
            } as unknown as AxiosResponse;
            const axiosError = new AxiosError(
                'Rules added successfully',
                undefined,
                undefined,
                undefined,
                postResponse,
            );
            postStub.onCall(0).throws(axiosError);
            const connectStub = sinon
                .stub(WebServerRunner.prototype, 'connect')
                .resolves();
            const existsSyncStub = sinon.stub(fs, 'existsSync').resolves(true);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            runner.validateAndSetRules(rules);
            result = await runner.addRules();
            expect(existsSyncStub.callCount).to.be.eql(1);
            expect(axiosInstanceStub.callCount).to.be.eql(1);
            expect(postStub.callCount).to.be.eql(1);
            expect(connectStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(2);
            expect(debugStub.callCount).to.be.eql(2);
            expect(result).to.be.eql(true);
        });

        it('Should fail to add rules: invalid server response', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            delete config.envFile;
            const postResponse = {
                status: HttpStatusCode.NotFound,
            } as unknown as AxiosResponse;
            const axiosError = new AxiosError(
                'Failed to add rules',
                undefined,
                undefined,
                undefined,
                postResponse,
            );
            postStub.onCall(0).throws(axiosError);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            runner.validateAndSetRules(rules);
            try {
                await runner.addRules();
            } catch (err) {
                expect(err).to.be.not.null;
                expect(isAxiosError(err)).to.be.true;
                expect((err as AxiosError<Error>).response).to.be.eql(
                    postResponse,
                );
            } finally {
                expect(axiosInstanceStub.callCount).to.be.eql(1);
                expect(postStub.callCount).to.be.eql(1);
                expect(loggerInstance.callCount).to.be.eql(2);
                expect(debugStub.callCount).to.be.eql(2);
            }
        });

        it('Should fail to add rules: unknown server response', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            delete config.envFile;
            const error = new Error('Failed to add rules');
            postStub.onCall(0).throws(error);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            runner.validateAndSetRules(rules);
            try {
                await runner.addRules();
            } catch (err) {
                expect(err).to.be.not.null;
                expect(isAxiosError(err)).to.be.false;
            } finally {
                expect(axiosInstanceStub.callCount).to.be.eql(1);
                expect(postStub.callCount).to.be.eql(1);
                expect(loggerInstance.callCount).to.be.eql(2);
                expect(debugStub.callCount).to.be.eql(2);
            }
        });

        it('Should fail to add rules: failed to receive response', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            delete config.envFile;
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            runner.validateAndSetRules(rules);
            result = await runner.addRules();
            expect(axiosInstanceStub.callCount).to.be.eql(1);
            expect(postStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(2);
            expect(debugStub.callCount).to.be.eql(2);
            expect(result).to.be.false;
        });
    });

    describe('connect - Unit Tests', function () {
        let existsSyncStub: sinon.SinonStub;

        beforeEach(() => {
            existsSyncStub = sinon.stub(fs, 'existsSync').resolves(true);
            process.env.UI_PASSWORD = faker.string.uuid();
        });

        it('Should successfully connect: secure mode enabled', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            const postResponse = {
                status: HttpStatusCode.Found,
            } as unknown as AxiosResponse;
            const axiosError = new AxiosError(
                'Connected',
                undefined,
                undefined,
                undefined,
                postResponse,
            );
            postStub.onCall(0).throws(axiosError);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            await runner.connect();
            expect(existsSyncStub.callCount).to.be.eql(1);
            expect(axiosInstanceStub.callCount).to.be.eql(1);
            expect(postStub.callCount).to.be.eql(1);
            expect(loggerInstance.callCount).to.be.eql(3);
            expect(debugStub.callCount).to.be.eql(3);
        });

        it('Should not connect: secure mode disabled', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            delete config.envFile;
            const postResponse = {
                status: HttpStatusCode.Found,
            } as unknown as AxiosResponse;
            const axiosError = new AxiosError(
                'Connected',
                undefined,
                undefined,
                undefined,
                postResponse,
            );
            postStub.onCall(0).throws(axiosError);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            await runner.connect();
            expect(existsSyncStub.callCount).to.be.eql(0);
            expect(axiosInstanceStub.callCount).to.be.eql(1);
            expect(postStub.callCount).to.be.eql(0);
            expect(loggerInstance.callCount).to.be.eql(0);
            expect(debugStub.callCount).to.be.eql(0);
        });

        it('Should fail to connect: invalid server response', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            const postResponse = {
                status: HttpStatusCode.NotFound,
            } as unknown as AxiosResponse;
            const axiosError = new AxiosError(
                'Connected',
                undefined,
                undefined,
                undefined,
                postResponse,
            );
            postStub.onCall(0).throws(axiosError);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            try {
                await runner.connect();
            } catch (err) {
                expect(err).to.be.not.null;
                expect(isAxiosError(err)).to.be.true;
                expect((err as AxiosError).response).to.be.eql(postResponse);
            } finally {
                expect(existsSyncStub.callCount).to.be.eql(1);
                expect(axiosInstanceStub.callCount).to.be.eql(1);
                expect(postStub.callCount).to.be.eql(1);
                expect(loggerInstance.callCount).to.be.eql(2);
                expect(debugStub.callCount).to.be.eql(2);
            }
        });

        it('Should fail to connect: unknown server response', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            const postResponse = {
                status: HttpStatusCode.NotFound,
            } as unknown as AxiosResponse;
            const axiosError = new AxiosError(
                'Failed to connect',
                undefined,
                undefined,
                undefined,
                postResponse,
            );
            postStub.onCall(0).throws(axiosError);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            try {
                await runner.connect();
            } catch (err) {
                expect(err).to.be.not.null;
                expect(isAxiosError(err)).to.be.true;
                expect((err as AxiosError).response).to.be.eql(postResponse);
            } finally {
                expect(existsSyncStub.callCount).to.be.eql(1);
                expect(axiosInstanceStub.callCount).to.be.eql(1);
                expect(postStub.callCount).to.be.eql(1);
                expect(loggerInstance.callCount).to.be.eql(2);
                expect(debugStub.callCount).to.be.eql(2);
            }
        });

        it('Should fail to connect: failed to receive response', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
                generateUniqUuid(),
            );
            try {
                await runner.connect();
            } catch (err) {
                const message = `Failed connect to ${config.host} using the provided credentials stored in ${config.envFile}`;
                expect(err).to.be.not.null;
                expect(isAxiosError(err)).to.be.false;
                expect((err as Error).message).to.be.eql(message);
            } finally {
                expect(existsSyncStub.callCount).to.be.eql(1);
                expect(axiosInstanceStub.callCount).to.be.eql(1);
                expect(postStub.callCount).to.be.eql(1);
                expect(loggerInstance.callCount).to.be.eql(1);
                expect(debugStub.callCount).to.be.eql(1);
            }
        });
    });
});
