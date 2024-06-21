import { TextDocument, Uri } from 'vscode';

import {
    CredentialDiggerRunnerBinaryConfig,
    CredentialDiggerRunnerConfig,
    CredentialDiggerRunnerDockerConfig,
    CredentialDiggerRuntime,
    DbType,
} from '../../../types/config';
import { Discovery } from '../../../types/db';
import { isNullOrUndefinedOrEmptyObject } from '../../utils';

export default abstract class Runner {
    private id: string;
    protected runnerType: CredentialDiggerRuntime;
    protected config: CredentialDiggerRunnerConfig;
    protected currentFile: TextDocument | undefined;
    protected fileLocation!: Uri;
    protected discoveriesFileLocation!: Uri;
    protected rules: Uri | undefined;

    public constructor(
        config: CredentialDiggerRunnerConfig,
        runnerType: CredentialDiggerRuntime,
        correlationId: string,
    ) {
        // Set
        this.runnerType = runnerType;
        this.config = config;
        this.id = correlationId;
        // Validate config
        this.validateConfig();
    }

    public getCurrentFile(): TextDocument {
        return this.currentFile as TextDocument;
    }

    public setCurrentFile(currentFile: TextDocument) {
        this.currentFile = currentFile;
    }

    public getId(): string {
        return this.id;
    }

    public abstract scan(): Promise<number>;
    public abstract getDiscoveries(storagePath: Uri): Promise<Discovery[]>;
    public abstract cleanup(): Promise<void>;
    public abstract addRules(): Promise<boolean>;
    protected validateConfig(): void {
        if (isNullOrUndefinedOrEmptyObject(this.config)) {
            throw new Error(
                'Please provide the Credential Digger configuration',
            );
        }
        switch (this.runnerType) {
            case CredentialDiggerRuntime.Docker:
                this.config = this.config as CredentialDiggerRunnerDockerConfig;
                break;
            case CredentialDiggerRuntime.Binary:
                this.config = this.config as CredentialDiggerRunnerBinaryConfig;
                break;
            case CredentialDiggerRuntime.WebServer:
                // Below validation is not relevant for the webserver case
                return;
            default:
                throw new Error(
                    'Please provide a valid Credential Digger type',
                );
        }
        if (!this.config.databaseConfig) {
            throw new Error(
                'Please provide the Credential Digger database configuration',
            );
        }
        if (!Object.values(DbType).includes(this.config.databaseConfig.type)) {
            throw new Error('Please provide a valid database type');
        }
        if (this.config.databaseConfig.type === DbType.SQLite) {
            if (!this.config.databaseConfig.sqlite) {
                throw new Error(
                    'Please provide the Credential Digger SQLite database configuration',
                );
            }
            if (!this.config.databaseConfig.sqlite.filename) {
                throw new Error(
                    'Please provide the Credential Digger SQLite database location',
                );
            }
        }
    }

    public validateAndSetRules(rules: string) {
        if (!rules) {
            throw new Error('Please provide the path to the rules file');
        }
        this.rules = Uri.parse(rules);
        switch (this.runnerType) {
            case CredentialDiggerRuntime.Docker:
                this.config = this.config as CredentialDiggerRunnerDockerConfig;
                break;
            case CredentialDiggerRuntime.Binary:
                this.config = this.config as CredentialDiggerRunnerBinaryConfig;
                break;
            default:
                return;
        }
        // Postgres env file is only relevant when adding rules
        if (this.config.databaseConfig?.type === DbType.Postgres) {
            if (!this.config.databaseConfig.postgres) {
                throw new Error(
                    'Please provide the Credential Digger Postgres database configuration',
                );
            }
            if (!this.config.databaseConfig.postgres.envFile) {
                throw new Error(
                    'Please provide the Credential Digger Postgres database environment file',
                );
            }
        }
    }
}
