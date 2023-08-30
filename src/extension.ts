import { existsSync, mkdirSync, statSync } from 'fs';
import {
    DiagnosticCollection,
    ExtensionContext,
    TextDocument,
    commands,
    languages,
    window,
    workspace,
} from 'vscode';

import LoggerFactory from './lib/logger-factory';
import MetaReaderFactory from './lib/meta-reader-factory';
import RunnerFactory from './lib/runner-factory';
import { cloneObject, isSettingsConfigured } from './lib/utils';
import { ExtensionConfig } from './types/config';

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

    // Define scan action
    const scanHandler = async (
        doc: TextDocument,
        showErrorOnEmptySettings = false,
    ) => {
        await scan(context, diagCollection, doc, showErrorOnEmptySettings);
    };

    const cleanUpHandler = (doc: TextDocument) => {
        cleanUp(doc, diagCollection);
    };

    // Subscribe to open/save document events
    context.subscriptions.push(
        workspace.onDidOpenTextDocument(scanHandler),
        workspace.onDidSaveTextDocument(scanHandler),
        workspace.onDidCloseTextDocument(cleanUpHandler),
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
    showErrorOnEmptySettings = false,
): Promise<void> {
    // Clone
    const currentDoc = cloneObject(doc);
    // Read settings
    let settings = workspace
        .getConfiguration()
        .get<ExtensionConfig>('credentialDigger');
    if (!isSettingsConfigured(settings)) {
        if (showErrorOnEmptySettings) {
            window.showErrorMessage(
                `Failed to scan file: Credential Digger extension is not configured`,
            );
        }
        LoggerFactory.getInstance().error(
            `Failed to scan file ${currentDoc.uri.fsPath}: Credential Digger extension is not configured`,
        );
        return;
    }
    settings = settings as ExtensionConfig;
    let id = null;
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
        );
        id = runner.getId();
        await runner.scan(currentDoc, context.storageUri, diagCollection);
    } catch (err) {
        LoggerFactory.getInstance().error(
            `${id}: Error occurred when scanning ${currentDoc.uri.fsPath}: ${err}`,
        );
        window.showErrorMessage(
            `Failed to scan ${currentDoc.uri.fsPath} (${id})`,
        );
    }
}

export async function addRules(): Promise<void> {
    let id = null;
    // Read settings
    let settings = workspace
        .getConfiguration()
        .get<ExtensionConfig>('credentialDigger');
    if (!isSettingsConfigured(settings)) {
        window.showErrorMessage(
            'Failed to add rules: Credential Digger extension is not configured',
        );
        return;
    }
    settings = settings as ExtensionConfig;
    try {
        // Add Rules
        const runner = RunnerFactory.getInstance(
            settings.credentialDiggerRunner,
        );
        id = runner.getId();
        runner.addRules(settings.rules ?? '');
    } catch (err) {
        LoggerFactory.getInstance().error(
            `${id}: Error occurred when adding rules: ${err}`,
        );
        window.showErrorMessage(`Failed to add rules (${id})`);
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
