import {
    CodeActionProvider,
    DiagnosticCollection,
    CodeActionKind,
    Disposable,
    commands,
    TextDocument,
    Range,
    Selection,
    CodeAction,
    WorkspaceEdit,
    Uri,
    Diagnostic,
    workspace,
} from 'vscode';

import {
    findSecretToReplace,
    getEdit,
    getEditor,
    handleError,
    removeDiagnosticAndRefresh,
} from '../utils';

/**
 * QuickFixProviderRemoveSecret class provides the code action to remove the secret value from the code snippet.
 */
export class QuickFixProviderRemoveSecret implements CodeActionProvider {
    private diagnosticCollection: DiagnosticCollection;

    constructor(diagnosticCollection: DiagnosticCollection) {
        this.diagnosticCollection = diagnosticCollection;
    }

    public static readonly providedCodeActionKinds = [CodeActionKind.QuickFix];

    /**
     * Register the command to remove the password value.
     */
    registerCommands(): Disposable {
        return commands.registerCommand(
            'vs-code-extension-for-project-credential-digger.remove-pwd',
            (action, diagnostic, snippet, secret) =>
                this.executeCodeAction(action, diagnostic, snippet, secret),
        );
    }

    /**
     * Provide the code actions to remove the password value.
     */
    provideCodeActions(
        document: TextDocument,
        range: Range | Selection,
    ): CodeAction[] | undefined {
        const codeActions: CodeAction[] = [];
        const uri = document.uri;
        const diagnotics = this.diagnosticCollection.get(uri);

        if (diagnotics) {
            for (const diagnostic of diagnotics) {
                this.handleDiagnostic(diagnostic, range, codeActions);
            }
        }
        return codeActions;
    }

    /**
     * Handle the diagnostic to remove the password value.
     */
    handleDiagnostic(
        diagnostic: Diagnostic,
        range: Range | Selection,
        codeActions: CodeAction[],
    ): void {
        if (diagnostic.range.intersection(range)) {
            const action = new CodeAction(
                'Remove Secret',
                CodeActionKind.QuickFix,
            );
            action.diagnostics = [diagnostic];

            //const regex = /[:=]\s*["'`]?(.*?)["'`]/i;
            const regex = /['"`]([^'`"]+)['"`]/g;
            const message = diagnostic.message
                .split('\n')[2]
                .replace('Snippet: ', '');
            const rule = diagnostic.message
                .split('\n')[4]
                .replace('Rule: ', '');
            const snippet = message.substring(1, message.length - 1);
            const match = snippet.match(regex);
            const secret = findSecretToReplace(match, snippet, rule);
            if (secret) {
                action.edit = new WorkspaceEdit();
                action.command = {
                    command:
                        'vs-code-extension-for-project-credential-digger.remove-pwd',
                    title: 'Remove Secret',
                    arguments: [action, diagnostic, snippet, secret],
                };
                codeActions.push(action);
            }
        }
    }

    /**
     * Execute the code action to remove the password value.
     */
    executeCodeAction(
        action: CodeAction,
        diagnostic: Diagnostic,
        snippet: string,
        secret: string,
    ) {
        try {
            const editor = getEditor();
            const edit = getEdit(action);
            const uri = editor.document.uri;

            this.removePasswordValue(
                edit,
                uri,
                diagnostic.range,
                snippet,
                secret,
            );
            this.diagnosticCollection = removeDiagnosticAndRefresh(
                uri,
                diagnostic,
                this.diagnosticCollection,
            );
        } catch (error) {
            handleError(error);
        }
    }

    /**
     * Remove the password value from the code snippet, and replace it with a word 'PLACEHOLDER'.
     */
    removePasswordValue(
        edit: WorkspaceEdit,
        uri: Uri,
        range: Range,
        snippet: string,
        secret: string,
    ) {
        const valueToReplace = secret.substring(1, secret.length - 1); // remove the quotes
        const newSnippet = snippet.replace(valueToReplace, 'PLACEHOLDER');
        edit.replace(uri, range, newSnippet);
        workspace.applyEdit(edit);
        return newSnippet;
    }
}
