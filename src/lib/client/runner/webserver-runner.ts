import { Discovery } from '../../../types/db';
import Runner from './runner';
import axios, { AxiosError, AxiosInstance, HttpStatusCode } from 'axios';
import {
    CredentialDiggerRunnerWebServerConfig,
    CredentialDiggerRuntime,
} from '../../../types/config';
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import LoggerFactory from '../../logger-factory';
import * as https from 'node:https';
import * as FormData from 'form-data';

export default class WebServerRunner extends Runner {
    private discoveries: Discovery[] = [];
    private httpInstance: AxiosInstance;
    private secureConnection = false;
    private cookies: CookieJar | undefined;

    public constructor(
        config: CredentialDiggerRunnerWebServerConfig,
        runnerType: CredentialDiggerRuntime,
        rules: string,
        currentFile?: vscode.TextDocument,
    ) {
        super(config, runnerType, rules, currentFile);
        this.config = this.config as CredentialDiggerRunnerWebServerConfig;
        // Create httpsAgent
        let httpsAgent;
        if (this.config.host.startsWith('https')) {
            httpsAgent = new https.Agent({
                rejectUnauthorized: false,
            });
        }
        // Create httpInstance
        this.httpInstance = wrapper(
            axios.create({
                baseURL: this.config.host,
                timeout: 120000,
                jar: new CookieJar(),
                maxRedirects: 0, // Disable
                httpsAgent,
            }),
        );
        // Secure connection
        if (this.config.envFile) {
            this.secureConnection = true;
            dotenv.config({
                path: path.resolve(this.config.envFile),
            });
        }
    }

    public async run(): Promise<number> {
        this.config = this.config as CredentialDiggerRunnerWebServerConfig;
        // Connect
        if (!this.cookies && this.secureConnection) {
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
            fs.createReadStream(this.currentFile!.uri.fsPath),
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
                this.discoveries.push({
                    id: d.id,
                    filename: d.file_name,
                    commitId: d.commit_id,
                    lineNumber: d.line_number,
                    snippet: d.snippet,
                    repoUrl: d.repo_url,
                    ruleId: d.rule_id,
                    state: d.state,
                    timestamp: d.timestamp,
                    rule: {
                        id: d.rule_id,
                        regex: d.rule_regex,
                        category: d.rule_category,
                        description: d.rule_description,
                    },
                });
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
        return new Promise((resolve) => {
            resolve(this.discoveries);
        });
    }

    public async cleanup(): Promise<void> {
        /* Cleanup*/
    }

    protected validateConfig(): void {
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

        if (this.config.envFile && !fs.existsSync(this.config.envFile)) {
            throw new Error('Please provide a valid Credential File location');
        }
        super.validateConfig();
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
            form.append('filename', fs.createReadStream(this.rules!.fsPath));
            await this.httpInstance.post('/upload_rule', form, {
                headers: form.getHeaders(),
                jar: this.cookies,
            });
        } catch (err) {
            const error = err as AxiosError<Error>;
            LoggerFactory.getInstance().debug(
                `${this.getId()}: addRules: status code: ${
                    error.response?.status
                }`,
            );
            if (error.response?.status === HttpStatusCode.Found) {
                return true;
            } else {
                throw err;
            }
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
            const error = err as AxiosError<Error>;
            LoggerFactory.getInstance().debug(
                `${this.getId()}: connect: status code: ${
                    error.response?.status
                }`,
            );
            if (error.response?.status === HttpStatusCode.Found) {
                // Retrieve the cookies to set them for each upcoming request
                this.cookies = error.response?.config?.jar;
            } else {
                throw err;
            }
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
