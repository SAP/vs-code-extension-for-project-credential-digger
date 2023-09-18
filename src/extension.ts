import { existsSync, mkdirSync, statSync } from 'fs';
import { relative } from 'path';
import {
    ConfigurationChangeEvent,
    DiagnosticCollection,
    ExtensionContext,
    TextDocument,
    commands,
    languages,
    window,
    workspace,
} from 'vscode';

import ignore from 'ignore';

import LoggerFactory from './lib/logger-factory';
import MetaReaderFactory from './lib/meta-reader-factory';
import RunnerFactory from './lib/runner-factory';
import {
    cloneObject,
    generateUniqUuid,
    isSettingsConfigured,
} from './lib/utils';
import { CONFIGURATION_NAME, ExtensionConfig } from './types/config';

// Called when the extension is activated
export async function activate(context: ExtensionContext): Promise<void> {
    // Create storageUri
    if (!context.storageUri) {
        window.showErrorMessage(
            `Failed to activate ${MetaReaderFactory.getInstance().getExtensionDisplayName()}`,
        );
        return;
    }
    if (!existsSync(context.storageUri.fsPath)) {
        mkdirSync(context.storageUri.fsPath);
    }
    // Create diag collection
    const diagCollection = languages.createDiagnosticCollection(
        MetaReaderFactory.getInstance().getExtensionDisplayName(),
    );

    // Show info message
    window.showInformationMessage(
        `${MetaReaderFactory.getInstance().getExtensionDisplayName()} is now active!`,
    );

    // Set filter pattern
    const settings = workspace
        .getConfiguration()
        .get<ExtensionConfig>(CONFIGURATION_NAME);
    let filterPattern: string[] = settings?.filterPattern ?? [];
    LoggerFactory.getInstance().warn(`Filter pattern: ${filterPattern}`);
    const updateFilterPatternHandler = (event: ConfigurationChangeEvent) => {
        filterPattern = getFilterPattern(event, filterPattern);
    };

    // Define scan action
    const scanHandler = async (
        doc: TextDocument,
        showErrorOnEmptySettings = false,
    ) => {
        await scan(
            context,
            diagCollection,
            doc,
            filterPattern,
            showErrorOnEmptySettings,
        );
    };

    const cleanUpHandler = (doc: TextDocument) => {
        cleanUp(doc, diagCollection);
    };

    // Subscribe to open/save/close document, configuration change events
    context.subscriptions.push(
        workspace.onDidOpenTextDocument(scanHandler),
        workspace.onDidSaveTextDocument(scanHandler),
        workspace.onDidCloseTextDocument(cleanUpHandler),
        workspace.onDidChangeConfiguration(updateFilterPatternHandler),
    );

    // The commandId has been defined in the package.json file
    let disposable = commands.registerCommand(
        MetaReaderFactory.getInstance().getExtensionScanCommand(),
        async () => {
            await scanSelectedFile(scanHandler);
        },
    );
    context.subscriptions.push(disposable);
    disposable = commands.registerCommand(
        MetaReaderFactory.getInstance().getExtensionAddRulesCommand(),
        addRules,
    );
    context.subscriptions.push(disposable);
}

// This method is called when the extension is deactivated
export function deactivate(): void {
    /* Deactivate the extension */
}

export async function scan(
    context: ExtensionContext,
    diagCollection: DiagnosticCollection,
    doc: TextDocument,
    fPattern: string[],
    showErrorOnEmptySettings = false,
): Promise<void> {
    const correlationId = generateUniqUuid();
    // Ignored?
    if (isIgnored(doc.uri.fsPath, fPattern)) {
        return;
    }
    // Clone
    const currentDoc = cloneObject(doc);
    // Read settings
    let settings = workspace
        .getConfiguration()
        .get<ExtensionConfig>(CONFIGURATION_NAME);
    if (!isSettingsConfigured(settings)) {
        if (showErrorOnEmptySettings) {
            window.showErrorMessage(
                `Failed to scan file: Credential Digger extension is not configured (${correlationId})`,
            );
        }
        LoggerFactory.getInstance().error(
            `Failed to scan file ${currentDoc.uri.fsPath}: Credential Digger extension is not configured`,
            { correlationId },
        );
        return;
    }
    settings = settings as ExtensionConfig;
    try {
        const stats = statSync(currentDoc.uri.fsPath, {
            throwIfNoEntry: false,
        });
        if (!stats?.isFile()) {
            return;
        }
        if (!context.storageUri) {
            throw new Error('Extension storage is undefined');
        }
        // Scan
        const runner = RunnerFactory.getInstance(
            settings.credentialDiggerRunner,
            correlationId,
        );
        await runner.scan(currentDoc, context.storageUri, diagCollection);
    } catch (err) {
        LoggerFactory.getInstance().error(
            `Error occurred when scanning ${currentDoc.uri.fsPath}: ${err}`,
            { correlationId },
        );
        window.showErrorMessage(
            `Failed to scan ${currentDoc.uri.fsPath} (${correlationId})`,
        );
    }
}

export async function addRules(): Promise<void> {
    const correlationId = generateUniqUuid();
    // Read settings
    let settings = workspace
        .getConfiguration()
        .get<ExtensionConfig>(CONFIGURATION_NAME);
    if (!isSettingsConfigured(settings)) {
        window.showErrorMessage(
            `Failed to add rules: Credential Digger extension is not configured (${correlationId})`,
        );
        return;
    }
    settings = settings as ExtensionConfig;
    try {
        // Add Rules
        const runner = RunnerFactory.getInstance(
            settings.credentialDiggerRunner,
            correlationId,
        );
        runner.addRules(settings.rules ?? '');
    } catch (err) {
        LoggerFactory.getInstance().error(
            `Error occurred when adding rules: ${err}`,
            { correlationId },
        );
        window.showErrorMessage(`Failed to add rules (${correlationId})`);
    }
}

export async function scanSelectedFile(
    callback: (
        doc: TextDocument,
        showErrorOnEmptySettings: boolean,
    ) => Promise<void>,
): Promise<void> {
    const currentFile = window.activeTextEditor?.document;
    if (currentFile?.uri) {
        await callback(currentFile, true);
    } else {
        window.showErrorMessage('Please select a file to scan');
    }
}

export function cleanUp(
    doc: TextDocument,
    diagCollection: DiagnosticCollection,
): void {
    diagCollection.delete(doc.uri);
}

export function getFilterPattern(
    event: ConfigurationChangeEvent,
    existingFPattern: string[],
): string[] {
    let fPattern: string[] = existingFPattern;
    const affected = event.affectsConfiguration(
        `${CONFIGURATION_NAME}.filterPattern`,
    );
    if (affected) {
        const settings = workspace
            .getConfiguration()
            .get<ExtensionConfig>(CONFIGURATION_NAME);
        fPattern = settings?.filterPattern ?? [];
        LoggerFactory.getInstance().warn(`Filter pattern changed: ${fPattern}`);
    }
    return fPattern;
}

export function isIgnored(location: string, fPattern: string[]): boolean {
    return ignore().add(fPattern).ignores(relative('/', location));
}
