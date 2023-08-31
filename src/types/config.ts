export interface SQLiteDbConfig {
    filename: string;
}

export interface PostgresDbConfig {
    envFile: string;
}
export interface DbConfig {
    type: DbType;
    sqlite?: SQLiteDbConfig;
    postgres?: PostgresDbConfig;
}

export enum DbType {
    SQLite = 'sqlite',
    Postgres = 'postgres',
}

export enum CredentialDiggerRuntime {
    Docker = 'docker',
    WebServer = 'webserver',
    Binary = 'binary',
}

export interface ExtensionConfig {
    rules?: string;
    filterPattern?: string[];
    credentialDiggerRunner: CredentialDiggerRunner;
}

export interface CredentialDiggerRunner {
    type: CredentialDiggerRuntime;
    docker?: CredentialDiggerRunnerDockerConfig;
    binary?: CredentialDiggerRunnerBinaryConfig;
    webserver?: CredentialDiggerRunnerWebServerConfig;
}

export interface CredentialDiggerRunnerDockerConfig {
    containerId: string;
    databaseConfig: DbConfig;
}

export interface CredentialDiggerRunnerBinaryConfig {
    path: string;
    databaseConfig: DbConfig;
}

export interface CredentialDiggerRunnerWebServerConfig {
    host: string;
    envFile?: string;
    certificateValidation?: boolean;
}

export type CredentialDiggerRunnerConfig =
    | CredentialDiggerRunnerDockerConfig
    | CredentialDiggerRunnerBinaryConfig
    | CredentialDiggerRunnerWebServerConfig;

export const CONFIGURATION_NAME = 'credentialDigger';
