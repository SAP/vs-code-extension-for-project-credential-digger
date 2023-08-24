import { Discovery } from '../../../types/db';
import Runner from './runner';
import axios, { AxiosError, AxiosInstance, HttpStatusCode } from 'axios';
import {
    CredentialDiggerRunnerWebServerConfig,
    CredentialDiggerRuntime,
} from '../../../types/config';
import { TextDocument, Uri } from 'vscode';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createReadStream, existsSync } from 'fs';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import LoggerFactory from '../../logger-factory';
import { Agent } from 'node:https';
import * as FormData from 'form-data';
import Utils from '../../utils';

export default class WebServerRunner extends Runner {
    private discoveries: Discovery[] = [];
    private httpInstance: AxiosInstance;
    private secureConnection = false;
    private cookies: CookieJar | undefined;

    public constructor(
        config: CredentialDiggerRunnerWebServerConfig,
        runnerType: CredentialDiggerRuntime,
    ) {
        super(config, runnerType);
        this.config = this.config as CredentialDiggerRunnerWebServerConfig;
        // Create httpsAgent
        let httpsAgent;
        if (this.config.host.startsWith('https')) {
            httpsAgent = new Agent({
                rejectUnauthorized: false,
            });
        }
        // Create httpInstance
        this.httpInstance = wrapper(
            axios.create({
                baseURL: this.config.host,
                timeout: 120000, // 120s
                jar: new CookieJar(),
                maxRedirects: 0, // Disable
                httpsAgent,
            }),
        );
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
        if (this.secureConnection && !this.cookies) {
            await this.connect();
        }
        // Call API
        const form = new FormData();
        form.append('pathModel', '');
        form.append('passwordModel', '');
        form.append('rule_to_use', 'all');
        form.append('forceScan', 'force');
        form.append(
            'filename',
            createReadStream((this.currentFile as TextDocument).uri.fsPath),
        );
        LoggerFactory.getInstance().debug(
            `${this.getId()}: scan: sending file ${
                this.currentFile?.uri.fsPath
            } to ${this.config.host}`,
        );
        const resp = await this.httpInstance.post('/scan_file', form, {
            headers: form.getHeaders(),
            jar: this.cookies,
        });
        LoggerFactory.getInstance().debug(
            `${this.getId()}: scan: status code: ${resp.status}`,
        );
        if (
            resp.status === HttpStatusCode.Ok &&
            resp.headers['content-type'] === 'application/json'
        ) {
            // Convert discoveries
            for (const d of resp.data) {
                this.discoveries.push(Utils.convertRawToDiscovery(d));
            }
        } else {
            throw new Error(
                `Failed to scan file ${this.currentFile?.uri.fsPath} on ${this.config.host}`,
            );
        }
        LoggerFactory.getInstance().debug(
            `${this.getId()}: scan: successfully sent ${
                this.currentFile?.uri.fsPath
            } to ${this.config.host}`,
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
        if (!this.cookies && this.secureConnection) {
            await this.connect();
        }
        // Call API
        LoggerFactory.getInstance().debug(
            `${this.getId()}: addRules: uploading rules stored in ${
                this.rules?.fsPath
            } to ${this.config.host}`,
        );
        try {
            const form = new FormData();
            form.append(
                'filename',
                createReadStream((this.rules as Uri).fsPath),
            );
            await this.httpInstance.post('/upload_rule', form, {
                headers: form.getHeaders(),
                jar: this.cookies,
            });
        } catch (err) {
            if (!axios.isAxiosError(err)) {
                LoggerFactory.getInstance().debug(
                    `${this.getId()}: addRules: error message: ${
                        (err as Error).message
                    }`,
                );
                throw err;
            }
            const error = err as AxiosError<Error>;
            LoggerFactory.getInstance().debug(
                `${this.getId()}: addRules: status code: ${
                    error.response?.status
                }`,
            );
            if (error.response?.status === HttpStatusCode.Found) {
                return true;
            }
            throw err;
        }
        LoggerFactory.getInstance().debug(
            `${this.getId()}: addRules: failed to add rules to ${
                this.config.host
            }`,
        );
        return false;
    }

    public async connect(): Promise<boolean> {
        if (!this.secureConnection) {
            return true;
        }
        this.config = this.config as CredentialDiggerRunnerWebServerConfig;
        LoggerFactory.getInstance().debug(
            `${this.getId()}: connect: connecting to ${
                this.config.host
            } using the provided credentials stored in ${this.config.envFile}`,
        );
        try {
            const form = new FormData();
            form.append('auth_key', process.env.UI_PASSWORD);
            await this.httpInstance.post('/login', form, {
                headers: form.getHeaders(),
            });
        } catch (err) {
            if (!axios.isAxiosError(err)) {
                throw err;
            }
            const error = err as AxiosError<Error>;
            LoggerFactory.getInstance().debug(
                `${this.getId()}: connect: status code: ${
                    error.response?.status
                }`,
            );
            if (error.response?.status !== HttpStatusCode.Found) {
                throw err;
            }
            // Retrieve the cookies to set them for each upcoming request
            this.cookies = error.response?.config?.jar;
        }
        if (!this.cookies) {
            throw new Error(
                `Failed connect to ${this.config.host} using the provided credentials stored in ${this.config.envFile}`,
            );
        }
        LoggerFactory.getInstance().debug(
            `${this.getId()}: connect: successfully connected to ${
                this.config.host
            } using the provided credentials stored in ${this.config.envFile}`,
        );
        return true;
    }
}
