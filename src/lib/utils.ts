import * as vscode from 'vscode';
import * as fs from 'fs';
import { parse } from 'csv-parse';
import { Discovery } from '../types/db';
import * as argon2 from 'argon2';
import * as _ from 'lodash';
import { TaskRevealKind, TaskPanelKind } from 'vscode';
import * as uuid from 'uuid';
import { ExtensionConfig } from '../types/config';

export default class Utils {
    public static async executeTask(task: vscode.Task) {
        // Generate a uniq id for the task to check on
        task.definition['taskId'] = Utils.generateUniqNumber();
        // Set defaults
        task.isBackground = true;
        task.presentationOptions = {
            reveal: TaskRevealKind.Silent,
            echo: true,
            focus: false,
            panel: TaskPanelKind.Shared,
            showReuseMessage: false,
            clear: true,
        };
        // Execute
        await vscode.tasks.executeTask(task);
        return new Promise<number | undefined>((resolve) => {
            const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
                if (
                    e.execution.task.definition.type === task.definition.type &&
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

    public static async parseDiscoveriesCSVFile(
        fileLocation: string,
    ): Promise<Discovery[]> {
        const records = [];
        const parser = fs.createReadStream(fileLocation).pipe(
            parse({
                columns: true,
                encoding: 'utf-8',
                delimiter: ',',
            }),
        );
        for await (const record of parser) {
            records.push({
                id: record.id,
                filename: record.file_name,
                commitId: record.commit_id,
                lineNumber: record.line_number,
                snippet: record.snippet,
                repoUrl: record.repo_url,
                ruleId: record.rule_id,
                state: record.state,
                timestamp: record.timestamp,
                rule: {
                    id: record.rule_id,
                    regex: record.rule_regex,
                    category: record.rule_category,
                    description: record.rule_description,
                },
            });
        }
        return records;
    }

    public static async createHash(
        data: string,
        length: number,
    ): Promise<string> {
        return (
            await argon2.hash(data, { raw: true, hashLength: length })
        ).toString('hex');
    }

    public static cloneObject<T>(object: T): T {
        if (!object) {
            return object;
        }
        return _.cloneDeep(object);
    }

    public static generateUniqNumber(): number {
        return Math.floor(Date.now() / 1000);
    }

    public static generateUniqUuid(): string {
        return uuid.v4();
    }

    public static isSettingsEmpty(settings: ExtensionConfig): boolean {
        return (
            Utils.isNullOrUndefinedOrEmptyObject(settings) ||
            (settings &&
                !Utils.isNullOrUndefinedOrEmptyObject(
                    settings.credentialDiggerRunner,
                ) &&
                Utils.isNullOrUndefinedOrEmptyObject(
                    settings.credentialDiggerRunner.binary,
                ) &&
                Utils.isNullOrUndefinedOrEmptyObject(
                    settings.credentialDiggerRunner.docker,
                ) &&
                Utils.isNullOrUndefinedOrEmptyObject(
                    settings.credentialDiggerRunner.webserver,
                ) &&
                !settings.credentialDiggerRunner.type)
        );
    }

    public static isNullOrUndefined(obj: unknown): boolean {
        return obj == null;
    }

    public static isEmptyObject(obj: object): boolean {
        return !Object.keys(obj).length;
    }

    public static isNullOrUndefinedOrEmptyObject(obj: unknown): boolean {
        return (
            Utils.isNullOrUndefined(obj) || Utils.isEmptyObject(obj as object)
        );
    }
}
