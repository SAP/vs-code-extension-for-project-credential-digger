import {
    ExtensionContext,
    DiagnosticCollection,
    window,
    languages,
    TextDocument,
    workspace,
    commands,
} from 'vscode';
import { ExtensionConfig } from './types/config';
import RunnerFactory from './lib/runner-factory';
import { existsSync, mkdirSync, promises } from 'fs';
import LoggerFactory from './lib/logger-factory';
import Utils from './lib/utils';
import MetaReaderFactory from './lib/meta-reader-factory';

// Called when the extension is activated
export async function activate(context: ExtensionContext): Promise<void> {
    // Create storageUri
    if (!context.storageUri) {
        await window.showErrorMessage(
            `Failed to activate ${MetaReaderFactory.getInstance().getExtensionName()}`,
        );
        return;
    }
    if (!existsSync(context.storageUri.fsPath)) {
        mkdirSync(context.storageUri.fsPath);
    }
    // Create diag collection
    const diagCollection = languages.createDiagnosticCollection(
        MetaReaderFactory.getInstance().getExtensionName(),
    );

    // Show info message
    await window.showInformationMessage(
        `${MetaReaderFactory.getInstance().getExtensionName()} is now active!`,
    );

    // Define scan action
    const scanHandler = async (
        doc: TextDocument,
        showErrorOnEmptySettings = false,
    ) => {
        await scan(context, diagCollection, doc, showErrorOnEmptySettings);
    };

    // Define add rules action
    const addRulesHandler = async () => {
        await addRules();
    };

    // Subscribe to open/save document events
    context.subscriptions.push(
        workspace.onDidOpenTextDocument(scanHandler),
        workspace.onDidSaveTextDocument(scanHandler),
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
        async () => {
            await addRulesHandler();
        },
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
    const currentDoc = Utils.cloneObject(doc);
    // Read settings
    let settings = workspace
        .getConfiguration()
        .get<ExtensionConfig>('credentialDigger');
    if (!Utils.isSettingsConfigured(settings)) {
        if (showErrorOnEmptySettings) {
            await window.showErrorMessage(
                `Failed to scan file: Credential Digger extension is not configured`,
            );
        }
        return;
    }
    settings = settings as ExtensionConfig;
    let id = null;
    try {
        const stats = await promises.stat(currentDoc.uri.fsPath);
        if (!stats.isFile()) {
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
        await window.showErrorMessage(
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
    if (!Utils.isSettingsConfigured(settings)) {
        await window.showErrorMessage(
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
        await window.showErrorMessage(`Failed to add rules (${id})`);
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
        await window.showErrorMessage('Please select a file to scan');
    }
}
