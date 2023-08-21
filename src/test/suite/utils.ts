import { faker } from '@faker-js/faker';
import { Discovery, Rule, State } from '../../types/db';
import {
    CredentialDiggerRunner,
    CredentialDiggerRunnerBinaryConfig,
    CredentialDiggerRuntime,
    DbConfig,
    DbType,
} from '../../types/config';

export function generateRule(): Rule {
    return {
        id: faker.number.int(),
        regex: faker.lorem.sentence(),
        category: faker.color.human(),
        description: faker.lorem.sentence(),
    };
}

export function generateDiscovery(lineNumber?: number): Discovery {
    return {
        id: faker.number.int(),
        filename: faker.system.filePath(),
        commitId: faker.git.commitSha(),
        lineNumber: lineNumber ?? faker.number.int({ min: 0 }),
        snippet: faker.lorem.text(),
        repoUrl: faker.internet.url(),
        ruleId: faker.number.int(),
        state: State.New,
        timestamp: faker.date.anytime().toISOString(),
        rule: generateRule(),
    };
}

export function generateDiscoveries(count: number): Discovery[] {
    const discoveries = [];
    for (let x = 0; x < count; x++) {
        discoveries.push(generateDiscovery(x + 1));
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
                    host: faker.internet.url(),
                    envFile: faker.system.filePath(),
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
