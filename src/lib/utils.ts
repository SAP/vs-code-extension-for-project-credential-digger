import crypto = require('crypto');
import { createReadStream } from 'fs';
import { Task, TaskPanelKind, TaskRevealKind, tasks } from 'vscode';

import { parse } from 'csv-parse';
import { cloneDeep } from 'lodash';
import { v4 } from 'uuid';

import { ExtensionConfig } from '../types/config';
import { Discovery, RawDiscovery } from '../types/db';

export async function executeTask(task: Task): Promise<number | undefined> {
    // Generate a uniq id for the task to check on
    task.definition['taskId'] = generateUniqNumber();
    // Set defaults
    task.isBackground = true;
    task.presentationOptions = {
        reveal: TaskRevealKind.Never,
        echo: true,
        focus: false,
        panel: TaskPanelKind.Shared,
        showReuseMessage: false,
        clear: true,
    };
    // Execute
    await tasks.executeTask(task);
    return await TaskUtils.getTaskExitCode(task);
}

export function convertRawToDiscovery(record: RawDiscovery): Discovery {
    return {
        id: parseInt(record.id),
        filename: record.file_name,
        commitId: record.commit_id,
        lineNumber: parseInt(record.line_number),
        snippet: record.snippet,
        repoUrl: record.repo_url,
        ruleId: parseInt(record.rule_id),
        state: record.state,
        timestamp: record.timestamp,
        rule: {
            id: parseInt(record.rule_id),
            regex: record.rule_regex,
            category: record.rule_category,
            description: record.rule_description,
        },
    };
}

export async function parseDiscoveriesCSVFile(
    fileLocation: string,
): Promise<Discovery[]> {
    const records = [];
    const parser = createReadStream(fileLocation).pipe(
        parse({
            columns: true,
            encoding: 'utf-8',
            delimiter: ',',
        }),
    );
    for await (const record of parser) {
        records.push(convertRawToDiscovery(record));
    }
    return records;
}

export function createHash(data: string, length: number): string {
    return crypto
        .createHash('sha256')
        .update(data)
        .digest('hex')
        .substring(0, length);
}

export function cloneObject<T>(object: T): T {
    if (!object) {
        return object;
    }
    return cloneDeep(object);
}

export function generateUniqNumber(): number {
    return Math.floor(Date.now() / 1000);
}

export function generateUniqUuid(): string {
    return v4();
}

export function isSettingsConfigured(
    settings: ExtensionConfig | undefined,
): boolean {
    // Settings not configured
    if (isNullOrUndefinedOrEmptyObject(settings)) {
        return false;
    }
    // Runner is not configured
    if (isNullOrUndefinedOrEmptyObject(settings?.credentialDiggerRunner)) {
        return false;
    }
    // Runner type is not set
    if (!settings?.credentialDiggerRunner.type) {
        return false;
    }
    // All Runner objects are not set
    if (
        isNullOrUndefinedOrEmptyObject(
            settings.credentialDiggerRunner.binary,
        ) &&
        isNullOrUndefinedOrEmptyObject(
            settings.credentialDiggerRunner.docker,
        ) &&
        isNullOrUndefinedOrEmptyObject(
            settings.credentialDiggerRunner.webserver,
        )
    ) {
        return false;
    }
    // Runner type does not match runner object
    if (
        isNullOrUndefinedOrEmptyObject(
            settings.credentialDiggerRunner[
                settings.credentialDiggerRunner.type
            ],
        )
    ) {
        return false;
    }
    return true;
}

export function isNullOrUndefined(obj: unknown): boolean {
    return obj == null;
}

export function isEmptyObject(obj: object): boolean {
    return !Object.keys(obj).length;
}

export function isNullOrUndefinedOrEmptyObject(obj: unknown): boolean {
    return isNullOrUndefined(obj) || isEmptyObject(obj as object);
}

export class TaskUtils {
    public static async getTaskExitCode(
        task: Task,
    ): Promise<number | undefined> {
        return new Promise<number | undefined>((resolve) => {
            const disposable = tasks.onDidEndTaskProcess((e) => {
                if (
                    e.execution.task.definition.type === task.definition.type &&
                    e.execution.task.definition.action ===
                        task.definition.action &&
                    e.execution.task.definition.taskId ===
                        task.definition.taskId &&
                    e.execution.task.definition.scanId ===
                        task.definition.scanId
                ) {
                    disposable.dispose();
                    resolve(e.exitCode);
                }
            });
        });
    }
}
