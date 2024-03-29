import { createReadStream, existsSync } from 'fs';
import { resolve } from 'path';
import { TextDocument, Uri } from 'vscode';

import axios, {
    AxiosError,
    AxiosInstance,
    isAxiosError,
    HttpStatusCode,
} from 'axios';
import * as dotenv from 'dotenv';
import FormData from 'form-data';
import { HttpCookieAgent, HttpsCookieAgent } from 'http-cookie-agent/http';
import { CookieJar } from 'tough-cookie';

import Runner from './runner';
import {
    CredentialDiggerRunnerWebServerConfig,
    CredentialDiggerRuntime,
} from '../../../types/config';
import { Discovery } from '../../../types/db';
import LoggerFactory from '../../logger-factory';
import { convertRawToDiscovery, isNullOrUndefined } from '../../utils';

export default class WebServerRunner extends Runner {
    private discoveries: Discovery[] = [];
    private httpInstance: AxiosInstance;
    private secureConnection = false;

    public constructor(
        config: CredentialDiggerRunnerWebServerConfig,
        runnerType: CredentialDiggerRuntime,
        correlationId: string,
    ) {
        super(config, runnerType, correlationId);
        this.config = this.config as CredentialDiggerRunnerWebServerConfig;
        // Create agents
        let httpsAgent, httpAgent;
        const jar = new CookieJar();
        if (this.config.host.startsWith('https')) {
            let certificateValidation = true;
            if (isNullOrUndefined(this.config.certificateValidation)) {
                LoggerFactory.getInstance().warn(
                    `Certificate validation flag is not set defaulting to ${certificateValidation}`,
                    { correlationId: this.getId() },
                );
            } else {
                certificateValidation = this.config
                    .certificateValidation as boolean;
                LoggerFactory.getInstance().warn(
                    `Certificate validation flag is set to ${certificateValidation}`,
                    { correlationId: this.getId() },
                );
            }
            httpsAgent = new HttpsCookieAgent({
                cookies: { jar },
                rejectUnauthorized: certificateValidation,
            });
        } else {
            httpAgent = new HttpCookieAgent({ cookies: { jar } });
        }
        // Create httpInstance
        this.httpInstance = axios.create({
            baseURL: this.config.host,
            timeout: 120000, // 120s
            maxRedirects: 0, // Disable
            httpsAgent,
            httpAgent,
        });
        // Secure connection
        if (this.config.envFile) {
            this.secureConnection = true;
            dotenv.config({
                path: resolve(this.config.envFile),
            });
        }
    }

    public async scan(): Promise<number> {
        this.config = this.config as CredentialDiggerRunnerWebServerConfig;
        // Connect
        if (this.secureConnection) {
            await this.connect();
        }
        // Call API
        const form = new FormData();
        form.append('pathModel', '');
        form.append('passwordModel', 'password');
        form.append('rule_to_use', 'all');
        form.append('forceScan', 'force');
        form.append(
            'filename',
            createReadStream((this.currentFile as TextDocument).uri.fsPath),
        );
        LoggerFactory.getInstance().debug(
            `scan: sending file ${this.currentFile?.uri.fsPath} to ${this.config.host}`,
            { correlationId: this.getId() },
        );
        const resp = await this.httpInstance.post('/scan_file', form, {
            headers: form.getHeaders(),
        });
        LoggerFactory.getInstance().debug(`scan: status code: ${resp.status}`, {
            correlationId: this.getId(),
        });
        if (
            resp.status === HttpStatusCode.Ok &&
            resp.headers['content-type'] === 'application/json'
        ) {
            // Convert discoveries
            for (const r of resp.data) {
                const d = convertRawToDiscovery(r, true);
                if (d) {
                    this.discoveries.push(d);
                }
            }
        } else {
            throw new Error(
                `Failed to scan file ${this.currentFile?.uri.fsPath} on ${this.config.host}`,
            );
        }
        LoggerFactory.getInstance().debug(
            `scan: successfully sent ${this.currentFile?.uri.fsPath} to ${this.config.host}: ${this.discoveries.length} discoveries`,
            { correlationId: this.getId() },
        );
        // Return
        return this.discoveries.length;
    }

    public async getDiscoveries(): Promise<Discovery[]> {
        return Promise.resolve(this.discoveries);
    }

    public async cleanup(): Promise<void> {
        /* Cleanup*/
    }

    protected validateConfig(): void {
        super.validateConfig();
        this.config = this.config as CredentialDiggerRunnerWebServerConfig;
        if (!this.config.host) {
            throw new Error(
                'Please provide the URL of the Credential Digger Webserver',
            );
        }

        if (!this.config.host.startsWith('http')) {
            throw new Error(
                'Please provide a valid URL of the Credential Digger Webserver',
            );
        }

        if (this.config.envFile && !existsSync(this.config.envFile)) {
            throw new Error('Please provide a valid Credential File location');
        }
    }

    public async addRules(): Promise<boolean> {
        this.config = this.config as CredentialDiggerRunnerWebServerConfig;
        // Connect
        if (this.secureConnection) {
            await this.connect();
        }
        // Call API
        LoggerFactory.getInstance().debug(
            `addRules: uploading rules stored in ${this.rules?.fsPath} to ${this.config.host}`,
            { correlationId: this.getId() },
        );
        try {
            const form = new FormData();
            form.append(
                'filename',
                createReadStream((this.rules as Uri).fsPath),
            );
            await this.httpInstance.post('/upload_rule', form, {
                headers: form.getHeaders(),
            });
        } catch (err) {
            if (!isAxiosError(err)) {
                LoggerFactory.getInstance().debug(
                    `addRules: error message: ${(err as Error).message}`,
                    { correlationId: this.getId() },
                );
                throw err;
            }
            const error = err as AxiosError<Error>;
            LoggerFactory.getInstance().debug(
                `addRules: status code: ${error.response?.status}`,
                { correlationId: this.getId() },
            );
            if (error.response?.status === HttpStatusCode.Found) {
                return true;
            }
            throw err;
        }
        LoggerFactory.getInstance().debug(
            `addRules: failed to add rules to ${this.config.host}`,
            { correlationId: this.getId() },
        );
        return false;
    }

    public async connect(): Promise<void> {
        if (!this.secureConnection) {
            return;
        }
        this.config = this.config as CredentialDiggerRunnerWebServerConfig;
        LoggerFactory.getInstance().debug(
            `connect: connecting to ${this.config.host} using the provided credentials stored in ${this.config.envFile}`,
            { correlationId: this.getId() },
        );
        try {
            const form = new FormData();
            form.append('auth_key', process.env.UI_PASSWORD);
            await this.httpInstance.post('/login', form, {
                headers: form.getHeaders(),
            });
        } catch (err) {
            if (!isAxiosError(err)) {
                throw err;
            }
            const error = err as AxiosError<Error>;
            LoggerFactory.getInstance().debug(
                `connect: status code: ${error.response?.status}`,
                { correlationId: this.getId() },
            );
            if (error.response?.status !== HttpStatusCode.Found) {
                throw err;
            }
            LoggerFactory.getInstance().debug(
                `connect: successfully connected to ${this.config.host} using the provided credentials stored in ${this.config.envFile}`,
                { correlationId: this.getId() },
            );
            return;
        }
        throw new Error(
            `Failed connect to ${this.config.host} using the provided credentials stored in ${this.config.envFile}`,
        );
    }
}
