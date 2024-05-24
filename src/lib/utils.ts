import * as crypto from 'crypto';
import { createReadStream, existsSync, promises as fs } from 'fs';
import { resolve } from 'path';
import {
    CodeAction,
    Diagnostic,
    DiagnosticCollection,
    Task,
    TaskPanelKind,
    TaskRevealKind,
    Uri,
    tasks,
    window,
    workspace,
} from 'vscode';

import { parse } from 'csv-parse';
import { cloneDeep } from 'lodash';

import { call_openAI_gpt3 } from './code-actions/openai';
import { call_openAI_btp } from './code-actions/openai-btp';
import { CONFIGURATION_NAME, ExtensionConfig } from '../types/config';
import { Discovery, RawDiscovery, State } from '../types/db';

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

export function convertRawToDiscovery(
    record: RawDiscovery,
    filterFalsePositive: boolean,
): Discovery | undefined {
    if (
        (filterFalsePositive && record.state !== State.FalsePositive) ||
        !filterFalsePositive
    ) {
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
    return;
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
        const d = convertRawToDiscovery(record, true);
        if (d && !isNullOrUndefinedOrEmptyObject(d)) {
            records.push(d);
        }
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
    return crypto.randomUUID();
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

/**
 * function to get the AI response from the OpenAI API
 * Check the configuration and the key mode from the settings view of the extension
 */
export async function getAIResponse(prompt: string) {
    const settings = workspace
        .getConfiguration()
        .get<ExtensionConfig>(CONFIGURATION_NAME);
    if (!settings) {
        return {
            success: false,
            message: 'Extension setting is not configured',
        };
    }
    if (!settings.openaiCallMode) {
        return { success: false, message: '"OpenAI" Mode is not configured' };
    }
    if (!settings.openaiKeyPath) {
        return { success: false, message: '"OpenAI" key is not configured' };
    }

    const AIfunction =
        settings.openaiCallMode === 'BTP OpenAI'
            ? call_openAI_btp
            : call_openAI_gpt3;

    window.showInformationMessage(
        '⛏️ Credential Digger: 🤖 Wait! We are calling an AI for you. 🤖',
    );
    return await AIfunction(prompt, settings.openaiKeyPath);
}

/**
 * function to remove the diagnostic from the collection and refresh the diagnostics
 */
export function removeDiagnosticAndRefresh(
    uri: Uri,
    diagnosticToRemove: Diagnostic,
    diagnosticCollection: DiagnosticCollection,
) {
    let diagnostics = diagnosticCollection.get(uri);
    if (diagnostics) {
        diagnostics = diagnostics.filter((d) => d !== diagnosticToRemove);
        diagnosticCollection.set(uri, diagnostics);
    }
    return diagnosticCollection;
}

/**
 * function to get the WorkspaceEdit from the CodeAction
 */
export function getEdit(action: CodeAction) {
    const edit = action.edit;
    if (!edit) {
        throw new Error('No WorkspaceEdit provided');
    }
    return edit;
}

/**
 * function to get the active editor
 */
export function getEditor() {
    const editor = window.activeTextEditor;
    if (!editor) {
        throw new Error('No editor is active.');
    }
    return editor;
}

/**
 * function to handle the error
 */
export function handleError(error: unknown): void {
    if (error instanceof Error) {
        console.error('Error: ', error.message);
        window.showErrorMessage('⛏️ Credential Digger: ' + error.message);
        return;
    } else {
        console.error('Error: ', error);
        window.showErrorMessage('⛏️ Credential Digger: ' + error);
        return;
    }
}

/**
 * Function to load the JSON data from the file
 * Used for two different types of JSON data
 * 1. Language data -> isLanguage: true
 * 2. AI prompts and docs -> isLanguage: false
 */
export async function loadJsonData(path: string, isLanguage: boolean) {
    if (!existsSync(resolve(__dirname, path))) {
        throw new Error('File not found: ' + path);
    }

    const rawData = await fs.readFile(resolve(__dirname, path), 'utf-8');
    try {
        if (isLanguage) {
            return JSON.parse(rawData);
        } else {
            return JSON.parse(rawData);
        }
    } catch (error) {
        throw new Error('Invalid JSON data: ' + error);
    }
}

/**
 * Find the secret value to replace.
 */
export function findSecretToReplace(
    match: RegExpMatchArray | null,
    snippet: string,
    rules: string,
) {
    if (!match) {
        // no match
        return null;
    }

    if (match.length === 1) {
        // only one match
        return match[0];
    }

    // if the snippet contains '=>' or ':' and there are two matches
    // means the secret is the value of the key-value pair
    if (
        (snippet.includes('=>') || snippet.includes(':')) &&
        match.length === 2
    ) {
        return match[1];
    }

    // more than one match then return the first one by default
    if (!snippet.includes('=>') && match.length > 1) {
        for (const m of match) {
            const newMacth = m.match(rules);
            if (newMacth) {
                return m;
            }
        }
    }
    return null;
}
