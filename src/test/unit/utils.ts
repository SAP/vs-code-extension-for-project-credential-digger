import { TextDocument, Uri } from 'vscode';

import { faker } from '@faker-js/faker';

import { convertRawToDiscovery } from '../../lib/utils';
import {
    CredentialDiggerRunner,
    CredentialDiggerRuntime,
    DbConfig,
    DbType,
} from '../../types/config';
import { Discovery, RawDiscovery, State } from '../../types/db';

export function generateRawDiscovery(lineNumber?: number): RawDiscovery {
    return {
        id: `${faker.number.int()}`,
        file_name: faker.system.filePath(),
        commit_id: faker.git.commitSha(),
        line_number: `${lineNumber ?? faker.number.int({ min: 0 })}`,
        snippet: faker.lorem.text(),
        repo_url: faker.internet.url(),
        rule_id: `${faker.number.int()}`,
        state: State.New,
        timestamp: faker.date.anytime().toISOString(),
        rule_regex: faker.lorem.sentence(),
        rule_category: faker.color.human(),
        rule_description: faker.lorem.sentence(),
    };
}

export function generateDiscoveries(count: number): Discovery[] {
    const discoveries = [];
    for (let x = 0; x < count; x++) {
        const d = convertRawToDiscovery(generateRawDiscovery(x + 1), true);
        if (d) {
            discoveries.push(d);
        }
    }
    return discoveries;
}

export function generateRawDiscoveries(count: number): RawDiscovery[] {
    const discoveries = [];
    for (let x = 0; x < count; x++) {
        discoveries.push(generateRawDiscovery(x + 1));
    }
    return discoveries;
}

export function generateDBConfig(dbType: DbType): DbConfig {
    switch (dbType) {
        case DbType.Postgres:
            return {
                type: DbType.Postgres,
                postgres: {
                    envFile: faker.system.filePath(),
                },
            };
        default:
            return {
                type: DbType.SQLite,
                sqlite: {
                    filename: faker.system.filePath(),
                },
            };
    }
}

export function generateCredentialDiggerRunnerConfig(
    runnerType: CredentialDiggerRuntime,
    databaseConfig?: DbConfig,
): CredentialDiggerRunner {
    switch (runnerType) {
        case CredentialDiggerRuntime.Docker:
            return {
                type: CredentialDiggerRuntime.Docker,
                docker: {
                    containerId: faker.git.commitSha(),
                    databaseConfig:
                        databaseConfig ?? generateDBConfig(DbType.SQLite),
                },
            };
        case CredentialDiggerRuntime.WebServer:
            return {
                type: CredentialDiggerRuntime.WebServer,
                webserver: {
                    host: faker.internet.url({ protocol: 'http' }),
                    envFile: faker.system.filePath(),
                    certificateValidation: false,
                },
            };
        default:
            return {
                type: CredentialDiggerRuntime.Binary,
                binary: {
                    path: faker.system.filePath(),
                    databaseConfig:
                        databaseConfig ?? generateDBConfig(DbType.SQLite),
                },
            };
    }
}

export function generateCurrentFile(
    discoveries?: Discovery[] | RawDiscovery[],
): TextDocument {
    const isEmpty = discoveries?.length;
    return {
        uri: Uri.parse(faker.system.filePath()),
        lineAt: (line: number) => {
            return {
                text:
                    isEmpty && discoveries[line].snippet
                        ? faker.lorem.sentence() +
                          discoveries[line].snippet +
                          faker.lorem.sentence()
                        : faker.string.sample((line + 1) * 2),
            };
        },
    } as unknown as TextDocument;
}
