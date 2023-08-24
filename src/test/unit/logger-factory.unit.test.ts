import { LogOutputChannel, window } from 'vscode';

import { faker } from '@faker-js/faker';
import * as vscodeLogger from '@vscode-logging/logger';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';

import LoggerFactory from '../../lib/logger-factory';
import MetaReaderFactory from '../../lib/meta-reader-factory';

describe('LoggerFactory - Unit Tests', function () {
    let messages: string[];
    let getExtensionNameStub: sinon.SinonStub;
    let createOutputChannelStub: sinon.SinonStub;
    let getExtensionLoggerStub: sinon.SinonStub;
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
        createOutputChannelStub = sinon
            .stub(window, 'createOutputChannel')
            .returns({} as unknown as LogOutputChannel);
        fatalStub = sinon.stub().returns(undefined);
        errorStub = sinon.stub().returns(undefined);
        warnStub = sinon.stub().returns(undefined);
        infoStub = sinon.stub().returns(undefined);
        debugStub = sinon.stub().returns(undefined);
        traceStub = sinon.stub().returns(undefined);
        getExtensionLoggerStub = sinon
            .stub(vscodeLogger, 'getExtensionLogger')
            .returns({
                fatal: fatalStub,
                error: errorStub,
                warn: warnStub,
                info: infoStub,
                debug: debugStub,
                trace: traceStub,
            } as unknown as vscodeLogger.IVSCodeExtLogger);
    });

    beforeEach(() => {
        messages = [faker.string.sample(10), faker.string.sample(10)];
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getInstance - Unit Tests', function () {
        it('Should create instance successfully', function () {
            LoggerFactory.getInstance();
            LoggerFactory.getInstance();
            expect(getExtensionNameStub.callCount).to.be.eql(1);
            expect(createOutputChannelStub.callCount).to.be.eql(1);
            expect(getExtensionLoggerStub.callCount).to.be.eql(1);
        });
    });

    describe('fatal - Unit Tests', function () {
        it('Should log fatal', function () {
            for (const m of messages) {
                LoggerFactory.getInstance().fatal(m);
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
                LoggerFactory.getInstance().error(m);
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
                LoggerFactory.getInstance().warn(m);
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
                LoggerFactory.getInstance().info(m);
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
                LoggerFactory.getInstance().debug(m);
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
                LoggerFactory.getInstance().trace(m);
            }
            expect(traceStub.callCount).to.be.eql(messages.length);
            for (let i = 0; i < messages.length; i++) {
                expect(traceStub.getCall(i).args[0]).to.be.eql(messages[i]);
            }
        });
    });
});
