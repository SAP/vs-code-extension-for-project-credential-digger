import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { describe, it, beforeEach, afterEach } from 'mocha';
import axios, {
    AxiosError,
    AxiosInstance,
    AxiosResponse,
    HttpStatusCode,
} from 'axios';
import {
    CredentialDiggerRunnerWebServerConfig,
    CredentialDiggerRuntime,
} from '../../../../types/config';
import WebServerRunner from '../../../../lib/client/runner/webserver-runner';
import * as AxiosCookieJar from 'axios-cookiejar-support';
import {
    generateCredentialDiggerRunnerConfig,
    generateRawDiscoveries,
} from '../../utils';
import { Discovery, RawDiscovery } from '../../../../types/db';
import LoggerFactory from '../../../../lib/logger-factory';
import * as fs from 'fs';
import Utils from '../../../../lib/utils';

describe('WebserverRunner  - Unit Tests', function () {
    let currentFile: vscode.TextDocument;
    let config: CredentialDiggerRunnerWebServerConfig;
    let rawDiscoveries: RawDiscovery[];
    let runner: WebServerRunner;
    let httpWrapperStub: sinon.SinonStub;
    let debugStub: sinon.SinonStub;

    beforeEach(() => {
        rawDiscoveries = generateRawDiscoveries(2);
        currentFile = {
            uri: vscode.Uri.parse(faker.system.filePath()),
            lineAt: (line: number) => {
                return {
                    text:
                        faker.lorem.sentence() +
                        rawDiscoveries[line].snippet +
                        faker.lorem.sentence(),
                };
            },
        } as unknown as vscode.TextDocument;
        debugStub = sinon.stub(LoggerFactory.getInstance(), 'debug').resolves();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('scan - Unit Tests', function () {
        let result: number;

        it('Should successfully scan a file: secure mode disabled', async function () {
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
            httpWrapperStub = sinon
                .stub(AxiosCookieJar, 'wrapper')
                .returns({
                    post: sinon.stub().resolves(postResponse),
                } as unknown as AxiosInstance);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
            );
            runner.setCurrentFile(currentFile);
            result = await runner.scan();
            expect(httpWrapperStub.callCount).to.be.eql(1);
            expect(debugStub.callCount).to.be.eql(3);
            expect(result).to.be.eql(rawDiscoveries.length);
        });

        it('Should successfully scan a file: secure mode enabled', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            const postResponse = {
                status: HttpStatusCode.Ok,
                headers: {
                    'content-type': 'application/json',
                },
                data: rawDiscoveries,
            };
            httpWrapperStub = sinon
                .stub(AxiosCookieJar, 'wrapper')
                .returns({
                    post: sinon.stub().resolves(postResponse),
                } as unknown as AxiosInstance);
            const connectStub = sinon
                .stub(WebServerRunner.prototype, 'connect')
                .resolves();
            const existsSyncStub = sinon.stub(fs, 'existsSync').resolves(true);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
            );
            runner.setCurrentFile(currentFile);
            result = await runner.scan();
            expect(existsSyncStub.callCount).to.be.eql(1);
            expect(httpWrapperStub.callCount).to.be.eql(1);
            expect(connectStub.callCount).to.be.eql(1);
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
            httpWrapperStub = sinon
                .stub(AxiosCookieJar, 'wrapper')
                .returns({
                    post: sinon.stub().resolves(postResponse),
                } as unknown as AxiosInstance);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
            );
            runner.setCurrentFile(currentFile);
            result = await runner.scan();
            expect(httpWrapperStub.callCount).to.be.eql(1);
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
            httpWrapperStub = sinon
                .stub(AxiosCookieJar, 'wrapper')
                .returns({
                    post: sinon.stub().resolves(postResponse),
                } as unknown as AxiosInstance);
            const message = `Failed to scan file ${currentFile.uri.fsPath} on ${config.host}`;
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
            );
            runner.setCurrentFile(currentFile);
            try {
                result = await runner.scan();
            } catch (err) {
                expect(err).to.be.not.null;
                expect((err as Error).message).to.be.eql(message);
            } finally {
                expect(httpWrapperStub.callCount).to.be.eql(1);
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
            httpWrapperStub = sinon
                .stub(AxiosCookieJar, 'wrapper')
                .returns({
                    post: sinon.stub().resolves(postResponse),
                } as unknown as AxiosInstance);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
            );
            runner.setCurrentFile(currentFile);
            const count = await runner.scan();
            result = await runner.getDiscoveries();
            const discoveries: Discovery[] = [];
            rawDiscoveries.forEach((d) => {
                discoveries.push(Utils.convertRawToDiscovery(d));
            });
            expect(httpWrapperStub.callCount).to.be.eql(1);
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
            httpWrapperStub = sinon
                .stub(AxiosCookieJar, 'wrapper')
                .returns({
                    post: sinon.stub().throws(axiosError),
                } as unknown as AxiosInstance);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
            );
            runner.validateAndSetRules(rules);
            result = await runner.addRules();
            expect(httpWrapperStub.callCount).to.be.eql(1);
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
            httpWrapperStub = sinon
                .stub(AxiosCookieJar, 'wrapper')
                .returns({
                    post: sinon.stub().throws(axiosError),
                } as unknown as AxiosInstance);
            const connectStub = sinon
                .stub(WebServerRunner.prototype, 'connect')
                .resolves();
            const existsSyncStub = sinon.stub(fs, 'existsSync').resolves(true);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
            );
            runner.validateAndSetRules(rules);
            result = await runner.addRules();
            expect(existsSyncStub.callCount).to.be.eql(1);
            expect(httpWrapperStub.callCount).to.be.eql(1);
            expect(connectStub.callCount).to.be.eql(1);
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
            httpWrapperStub = sinon
                .stub(AxiosCookieJar, 'wrapper')
                .returns({
                    post: sinon.stub().throws(axiosError),
                } as unknown as AxiosInstance);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
            );
            runner.validateAndSetRules(rules);
            try {
                await runner.addRules();
            } catch (err) {
                expect(err).to.be.not.null;
                expect(axios.isAxiosError(err)).to.be.true;
                expect((err as AxiosError<Error>).response).to.be.eql(
                    postResponse,
                );
            } finally {
                expect(httpWrapperStub.callCount).to.be.eql(1);
                expect(debugStub.callCount).to.be.eql(2);
            }
        });

        it('Should fail to add rules: unknown server response', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            delete config.envFile;
            const error = new Error('Failed to add rules');
            httpWrapperStub = sinon
                .stub(AxiosCookieJar, 'wrapper')
                .returns({
                    post: sinon.stub().throws(error),
                } as unknown as AxiosInstance);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
            );
            runner.validateAndSetRules(rules);
            try {
                await runner.addRules();
            } catch (err) {
                expect(err).to.be.not.null;
                expect(axios.isAxiosError(err)).to.be.false;
            } finally {
                expect(httpWrapperStub.callCount).to.be.eql(1);
                expect(debugStub.callCount).to.be.eql(2);
            }
        });

        it('Should fail to add rules: failed to receive response', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            delete config.envFile;
            httpWrapperStub = sinon
                .stub(AxiosCookieJar, 'wrapper')
                .returns({
                    post: sinon.stub().resolves(),
                } as unknown as AxiosInstance);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
            );
            runner.validateAndSetRules(rules);
            result = await runner.addRules();
            expect(httpWrapperStub.callCount).to.be.eql(1);
            expect(debugStub.callCount).to.be.eql(2);
            expect(result).to.be.false;
        });
    });

    describe('connect - Unit Tests', function () {
        let result: boolean;
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
                config: { jar: faker.string.uuid() },
            } as unknown as AxiosResponse;
            const axiosError = new AxiosError(
                'Connected',
                undefined,
                undefined,
                undefined,
                postResponse,
            );
            httpWrapperStub = sinon
                .stub(AxiosCookieJar, 'wrapper')
                .returns({
                    post: sinon.stub().throws(axiosError),
                } as unknown as AxiosInstance);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
            );
            result = await runner.connect();
            expect(existsSyncStub.callCount).to.be.eql(1);
            expect(httpWrapperStub.callCount).to.be.eql(1);
            expect(debugStub.callCount).to.be.eql(3);
            expect(result).to.be.eql(true);
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
            const postStub = sinon.stub().throws(axiosError);
            httpWrapperStub = sinon
                .stub(AxiosCookieJar, 'wrapper')
                .returns({ post: postStub } as unknown as AxiosInstance);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
            );
            result = await runner.connect();
            expect(existsSyncStub.callCount).to.be.eql(0);
            expect(httpWrapperStub.callCount).to.be.eql(1);
            expect(postStub.callCount).to.be.eql(0);
            expect(debugStub.callCount).to.be.eql(0);
            expect(result).to.be.eql(true);
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
            httpWrapperStub = sinon
                .stub(AxiosCookieJar, 'wrapper')
                .returns({
                    post: sinon.stub().throws(axiosError),
                } as unknown as AxiosInstance);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
            );
            try {
                result = await runner.connect();
            } catch (err) {
                expect(err).to.be.not.null;
                expect(axios.isAxiosError(err)).to.be.true;
                expect((err as AxiosError).response).to.be.eql(postResponse);
            } finally {
                expect(existsSyncStub.callCount).to.be.eql(1);
                expect(httpWrapperStub.callCount).to.be.eql(1);
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
            httpWrapperStub = sinon
                .stub(AxiosCookieJar, 'wrapper')
                .returns({
                    post: sinon.stub().throws(axiosError),
                } as unknown as AxiosInstance);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
            );
            try {
                result = await runner.connect();
            } catch (err) {
                expect(err).to.be.not.null;
                expect(axios.isAxiosError(err)).to.be.true;
                expect((err as AxiosError).response).to.be.eql(postResponse);
            } finally {
                expect(existsSyncStub.callCount).to.be.eql(1);
                expect(httpWrapperStub.callCount).to.be.eql(1);
                expect(debugStub.callCount).to.be.eql(2);
            }
        });

        it('Should fail to connect: failed to receive response', async function () {
            config = generateCredentialDiggerRunnerConfig(
                CredentialDiggerRuntime.WebServer,
            ).webserver as CredentialDiggerRunnerWebServerConfig;
            httpWrapperStub = sinon
                .stub(AxiosCookieJar, 'wrapper')
                .returns({
                    post: sinon.stub().resolves(),
                } as unknown as AxiosInstance);
            runner = new WebServerRunner(
                config,
                CredentialDiggerRuntime.WebServer,
            );
            try {
                result = await runner.connect();
            } catch (err) {
                const message = `Failed connect to ${config.host} using the provided credentials stored in ${config.envFile}`;
                expect(err).to.be.not.null;
                expect(axios.isAxiosError(err)).to.be.false;
                expect((err as Error).message).to.be.eql(message);
            } finally {
                expect(existsSyncStub.callCount).to.be.eql(1);
                expect(httpWrapperStub.callCount).to.be.eql(1);
                expect(debugStub.callCount).to.be.eql(1);
            }
        });
    });
});
