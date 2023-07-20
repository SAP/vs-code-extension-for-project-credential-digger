import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { describe, it, beforeEach, afterEach } from 'mocha';

describe('WebserverRunner  - Unit Tests', function () {
    afterEach(() => {
        sinon.restore();
    });

    describe('scan - Unit Tests', function () {
        it('Should successfully scan a file: sqlite db', async function () {
            // validate the cmd that contains the sqlite part
        });

        it('Should successfully scan a file: postgres db', async function () {
            //
        });

        it('Should fail to scan a file', async function () {
            //
        });
    });

    describe('getDiscoveries - Unit Tests', function () {
        it('Should successfully get discoveries', async function () {
            //
        });

        it('Should fail to get discoveries', async function () {
            //
        });

        it('Should raise exception when getting discoveries', async function () {
            //
        });
    });

    describe('cleanup - Unit Tests', function () {
        it('Should successfully cleanup', async function () {
            //
        });

        it('Should return when file is empty', async function () {
            //
        });

        it('Should fail to cleanup', async function () {
            //
        });
    });

    describe('addRules - Unit Tests', function () {
        it('Should successfully add rules: sqlite db', async function () {
            //
        });

        it('Should successfully add rules: postgres db', async function () {
            //
        });

        it('Should fail to add rules', async function () {
            //
        });
    });
});
