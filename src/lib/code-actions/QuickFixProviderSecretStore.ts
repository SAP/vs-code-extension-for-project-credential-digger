import { extname } from 'path';
import {
    window,
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
    ViewColumn,
} from 'vscode';

import { AiPromptsAndDocs, Documentation } from '../../types/quickFix';
import { getAIResponse, handleError, loadJsonData } from '../utils';

/**
 * QuickFixProviderSecretStore class provides the code action to store the secret value in the secret manager.
 */
export class QuickFixProviderSecretStore implements CodeActionProvider {
    private diagnosticCollection: DiagnosticCollection;
    private aiPromptsAndDocs: AiPromptsAndDocs | null = null;

    constructor(diagnosticCollection: DiagnosticCollection) {
        this.diagnosticCollection = diagnosticCollection;
    }

    public static readonly providedCodeActionKinds = [CodeActionKind.QuickFix];

    /**
     * Register the command to store the secret value.
     */
    registerCommands(): Disposable {
        return commands.registerCommand(
            'vs-code-extension-for-project-credential-digger.store',
            (uri) => this.executeCodeAction(uri),
        );
    }

    /**
     * Provide the code actions to store the secret value.
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
                this.handleDiagnostic(diagnostic, range, codeActions, uri);
            }
        }
        return codeActions;
    }

    /**
     * Handle the diagnostic to store the secret value.
     */
    handleDiagnostic(
        diagnostic: Diagnostic,
        range: Range | Selection,
        codeActions: CodeAction[],
        uri: Uri,
    ) {
        if (diagnostic.range.intersection(range)) {
            const action = new CodeAction(
                'Secret Storage Options',
                CodeActionKind.QuickFix,
            );
            action.diagnostics = [diagnostic];
            action.edit = new WorkspaceEdit();
            action.command = {
                command:
                    'vs-code-extension-for-project-credential-digger.store',
                title: 'Secret Storage Options',
                arguments: [uri],
            };
            codeActions.push(action);
        }
    }

    /**
     * Execute the code action to store the secret value.
     * Propose the user to choose between BTP Credential Store, AWS Secrets Manager, or Open Source Tool.
     * Display the step-by-step guide to store the secret value based on the user's choice.
     */
    async executeCodeAction(uri: Uri) {
        try {
            const extension = extname(uri.fsPath);
            this.aiPromptsAndDocs = await loadJsonData(
                '../src/lib/code-actions/aiPromptsAndDocs.json',
                false,
            );

            window
                .showQuickPick(
                    [
                        'BTP Credential Store',
                        'AWS Secrets Manager',
                        'Vault from vaultproject.io',
                    ],
                    {
                        placeHolder: 'Please make a selection',
                    },
                )
                .then(async (value) => {
                    if (value) {
                        const guide_obj = await this.callAI(value, extension);
                        this.displayInctructions(guide_obj);
                    }
                });
        } catch (error) {
            handleError(error);
        }
    }

    /**
     * Display the step-by-step guide to store the secret value, on a webview panel.
     */
    displayInctructions(objInstructions: Documentation) {
        const panel = window.createWebviewPanel(
            'instructionPanel',
            objInstructions.title,
            ViewColumn.One,
            {},
        );

        // HTML content for the instructions
        const htmlContent = objInstructions.content;

        // Set the HTML content in the panel
        panel.webview.html = htmlContent;
    }

    /**
     * Call the AI model to get the step-by-step guide to store the secret value.
     */
    async callAI(value: string, extension: string) {
        const objDoc = {
            title: `${value} Step-by-Step Guide`,
            content: '',
        };

        if (!this.aiPromptsAndDocs) {
            return objDoc;
        }

        try {
            // BTP Credential Store requires a different prompt and documentation
            // The two other options share the same prompt and will display it in the same format
            const prompt =
                value === 'BTP Credential Store'
                    ? this.aiPromptsAndDocs.btp_prompt.replace(
                          'EXTENSION_TMP',
                          extension,
                      )
                    : this.aiPromptsAndDocs.other_prompt
                          .replace('EXTENSION_TMP', extension)
                          .replace(/VALUE_TMP/g, value);

            const aiResponse = await getAIResponse(prompt);

            if (!aiResponse.success) {
                handleError(aiResponse.message);
            }

            const doc =
                value === 'BTP Credential Store'
                    ? this.aiPromptsAndDocs.btp_documentation.replace(
                          'CODE_TMP',
                          aiResponse.message,
                      )
                    : aiResponse.message;

            objDoc.content = `${this.aiPromptsAndDocs.begin_html.replace(
                'VALUE_TMP',
                value,
            )} ${doc} ${this.aiPromptsAndDocs.end_html}`;

            return objDoc;
        } catch (error) {
            handleError(error);
            return objDoc;
        }
    }
}
