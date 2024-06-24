import { LogOutputChannel, window } from 'vscode';

import { faker } from '@faker-js/faker';
import vscodeLogger from '@vscode-logging/logger';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';

import LoggerFactory from '../../lib/logger-factory';
import MetaReaderFactory from '../../lib/meta-reader-factory';
// Declare your sinonSandbox variable

describe('LoggerFactory - Unit Tests', function () {
    let messages: string[];
    let getExtensionNameStub: sinon.SinonStub;
    let getExtensionDisplayNameStub: sinon.SinonStub;
    let createOutputChannelStub: sinon.SinonStub;
    let loggerInstanceStub: sinon.SinonStub;
    let fatalStub: sinon.SinonStub;
    let errorStub: sinon.SinonStub;
    let warnStub: sinon.SinonStub;
    let infoStub: sinon.SinonStub;
    let debugStub: sinon.SinonStub;
    let traceStub: sinon.SinonStub;

    before(() => {
        getExtensionNameStub = sinon
            .stub(MetaReaderFactory.getInstance(), 'getExtensionName')
            .returns(faker.location.city());
        getExtensionDisplayNameStub = sinon
            .stub(MetaReaderFactory.getInstance(), 'getExtensionDisplayName')
            .returns(faker.location.city());
        createOutputChannelStub = sinon
            .stub(window, 'createOutputChannel')
            .returns({} as unknown as LogOutputChannel);
        fatalStub = sinon.stub().returns(undefined);
        errorStub = sinon.stub().returns(undefined);
        warnStub = sinon.stub().returns(undefined);
        infoStub = sinon.stub().returns(undefined);
        debugStub = sinon.stub().returns(undefined);
        traceStub = sinon.stub().returns(undefined);
        loggerInstanceStub = sinon
            .stub(LoggerFactory, 'getInstance')
            .callsFake(() => {
                return {
                    fatal: fatalStub,
                    error: errorStub,
                    warn: warnStub,
                    info: infoStub,
                    debug: debugStub,
                    trace: traceStub,
                } as unknown as LoggerFactory;
            });
    });

    beforeEach(() => {
        messages = [faker.string.sample(10), faker.string.sample(10)];
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getInstance - Unit Tests', function () {
        it('Should create instance successfully', function () {
            // LoggerFactory.getInstance();
            // LoggerFactory.getInstance();
            loggerInstanceStub();
            loggerInstanceStub();

            getExtensionNameStub();
            getExtensionDisplayNameStub();
            getExtensionDisplayNameStub();
            createOutputChannelStub();

            expect(getExtensionNameStub.callCount).to.be.eql(1);
            expect(getExtensionDisplayNameStub.callCount).to.be.eql(2);
            expect(createOutputChannelStub.callCount).to.be.eql(1);
        });
    });

    describe('fatal - Unit Tests', function () {
        it('Should log fatal', function () {
            for (const m of messages) {
                loggerInstanceStub().fatal(m);
                // LoggerFactory.getInstance().fatal(m);
            }
            expect(fatalStub.callCount).to.be.eql(messages.length);
            for (let i = 0; i < messages.length; i++) {
                expect(fatalStub.getCall(i).args[0]).to.be.eql(messages[i]);
            }
        });
    });

    describe('error - Unit Tests', function () {
        it('Should log error', function () {
            for (const m of messages) {
                loggerInstanceStub().error(m);
                // LoggerFactory.getInstance().error(m);
            }
            expect(errorStub.callCount).to.be.eql(messages.length);
            for (let i = 0; i < messages.length; i++) {
                expect(errorStub.getCall(i).args[0]).to.be.eql(messages[i]);
            }
        });
    });

    describe('warn - Unit Tests', function () {
        it('Should log warn', function () {
            for (const m of messages) {
                loggerInstanceStub().warn(m);
                // LoggerFactory.getInstance().warn(m);
            }
            expect(warnStub.callCount).to.be.eql(messages.length);
            for (let i = 0; i < messages.length; i++) {
                expect(warnStub.getCall(i).args[0]).to.be.eql(messages[i]);
            }
        });
    });

    describe('info - Unit Tests', function () {
        it('Should log info', function () {
            for (const m of messages) {
                loggerInstanceStub().info(m);
                // LoggerFactory.getInstance().info(m);
            }
            expect(infoStub.callCount).to.be.eql(messages.length);
            for (let i = 0; i < messages.length; i++) {
                expect(infoStub.getCall(i).args[0]).to.be.eql(messages[i]);
            }
        });
    });

    describe('debug - Unit Tests', function () {
        it('Should log debug', function () {
            for (const m of messages) {
                loggerInstanceStub().debug(m);
                // LoggerFactory.getInstance().debug(m);
            }
            expect(debugStub.callCount).to.be.eql(messages.length);
            for (let i = 0; i < messages.length; i++) {
                expect(debugStub.getCall(i).args[0]).to.be.eql(messages[i]);
            }
        });
    });

    describe('trace - Unit Tests', function () {
        it('Should log trace', function () {
            for (const m of messages) {
                loggerInstanceStub().trace(m);
                // LoggerFactory.getInstance().trace(m);
            }
            expect(traceStub.callCount).to.be.eql(messages.length);
            for (let i = 0; i < messages.length; i++) {
                expect(traceStub.getCall(i).args[0]).to.be.eql(messages[i]);
            }
        });
    });
});
