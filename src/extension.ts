import * as vscode from 'vscode';
import { ExtensionConfig } from './types/config';
import RunnerFactory from './lib/runner-factory';
import * as fs from 'fs';
import LoggerFactory from './lib/logger-factory';
import Utils from './lib/utils';
import MetaReaderFactory from './lib/meta-reader-factory';

// Called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
    // Create storageUri
    if (!context.storageUri) {
        vscode.window.showErrorMessage(
            `Failed to activate ${MetaReaderFactory.getInstance().getExtensionName()}`,
        );
        return;
    }
    if (!fs.existsSync(context.storageUri.fsPath)) {
        fs.mkdirSync(context.storageUri.fsPath);
    }
    // Create dia collection
    const diagCollection = vscode.languages.createDiagnosticCollection('');

    // Show info message
    vscode.window.showInformationMessage(
        `${MetaReaderFactory.getInstance().getExtensionName()} is now active!`,
    );

    // Define scan action
    const scanHandler = async (
        doc: vscode.TextDocument,
        showErrorOnEmptySettings = false,
    ) => {
        // Clone
        const currentDoc = Utils.cloneObject(doc);
        // Read settings
        const settings = vscode.workspace
            .getConfiguration()
            .get<ExtensionConfig>('credentialDigger');
        if (!settings || !Utils.isSettingsConfigured(settings)) {
            if (showErrorOnEmptySettings) {
                vscode.window.showErrorMessage(
                    `Failed to scan file: Credential Digger extension is not configured`,
                );
            }
            return;
        }
        fs.stat(currentDoc.uri.fsPath, async (err, stats) => {
            if (err || !stats.isFile()) {
                return;
            }
            let id = null;
            try {
                if (!context.storageUri) {
                    throw new Error('Extension storage is undefined');
                }
                // Scan
                const runner = RunnerFactory.getInstance(
                    settings.credentialDiggerRunner,
                );
                id = runner.getId();
                await runner.scan(
                    currentDoc,
                    context.storageUri,
                    diagCollection,
                );
            } catch (err) {
                LoggerFactory.getInstance().error(
                    `${id}: Error occurred when scanning ${currentDoc.uri.fsPath}: ${err}`,
                );
                vscode.window.showErrorMessage(
                    `Failed to scan ${currentDoc.uri.fsPath} (${id})`,
                );
            }
        });
    };

    // Define add rules action
    const addRulesHandler = async () => {
        let id = null;
        // Read settings
        let settings = vscode.workspace
            .getConfiguration()
            .get<ExtensionConfig>('credentialDigger');
        if (!Utils.isSettingsConfigured(settings)) {
            vscode.window.showErrorMessage(
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
            vscode.window.showErrorMessage(`Failed to add rules (${id})`);
        }
    };

    // Subscribe to open/save document events
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(scanHandler),
        vscode.workspace.onDidSaveTextDocument(scanHandler),
    );

    // The commandId has been defined in the package.json file
    let disposable = vscode.commands.registerCommand(
        MetaReaderFactory.getInstance().getExtensionScanCommand(),
        async () => {
            const currentFile = vscode.window.activeTextEditor?.document;
            if (currentFile?.uri) {
                await scanHandler(currentFile, true);
            } else {
                vscode.window.showErrorMessage('Please select a file to scan');
            }
        },
    );
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand(
        MetaReaderFactory.getInstance().getExtensionAddRulesCommand(),
        async () => {
            await addRulesHandler();
        },
    );
    context.subscriptions.push(disposable);
}

// This method is called when the extension is deactivated
export function deactivate() {
    /* Deactivate the extension */
}
