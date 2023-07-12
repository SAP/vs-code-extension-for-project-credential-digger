import {
    CredentialDiggerRunnerBinaryConfig,
    CredentialDiggerRunnerConfig,
    CredentialDiggerRunnerDockerConfig,
    CredentialDiggerRuntime,
    DbType,
} from '../../../types/config';
import { Discovery } from '../../../types/db';
import * as vscode from 'vscode';
import Utils from '../../utils';

export default abstract class Runner {
    private id: string;
    protected runnerType: CredentialDiggerRuntime;
    protected config: CredentialDiggerRunnerConfig;
    protected currentFile: vscode.TextDocument | undefined;
    protected fileLocation!: vscode.Uri;
    protected discoveriesFileLocation!: vscode.Uri;
    protected rules: vscode.Uri | undefined;

    public constructor(
        config: CredentialDiggerRunnerConfig,
        runnerType: CredentialDiggerRuntime,
    ) {
        // Set
        this.runnerType = runnerType;
        this.config = config;
        // Generate a uniq uuid
        this.id = Utils.generateUniqUuid();
        // Validate config
        this.validateConfig();
    }

    public getCurrentFile(): vscode.TextDocument {
        return this.currentFile as vscode.TextDocument;
    }

    public setCurrentFile(currentFile: vscode.TextDocument) {
        this.currentFile = currentFile;
    }

    public getId(): string {
        return this.id;
    }

    public abstract run(): Promise<number>;
    public abstract getDiscoveries(
        storagePath: vscode.Uri,
    ): Promise<Discovery[]>;
    public abstract cleanup(): Promise<void>;
    public abstract addRules(): Promise<boolean>;
    protected validateConfig(): void {
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
        this.rules = vscode.Uri.parse(rules);
    }
}
