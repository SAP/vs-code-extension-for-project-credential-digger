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
    ProgressLocation,
} from 'vscode';

import {
    beginHtml,
    btpDocumentation,
    btpPrompt,
    endHtml,
    otherPrompt,
} from './data';
import { Documentation } from '../../types/quickFix';
import { getAIResponse, handleError } from '../utils';

/**
 * QuickFixProviderSecretStore class provides the code action to store the secret value in the secret manager.
 */
export class QuickFixProviderSecretStore implements CodeActionProvider {
    private diagnosticCollection: DiagnosticCollection;

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

        let progressId;
        let progressIncrement = 0;
        const incrementVal = 0.4;

        try {
            return await window.withProgress(
                {
                    location: ProgressLocation.Notification,
                    title: '⛏️ Credential Digger: 🤖 Wait! We are calling an AI for you. 🤖',
                    cancellable: false,
                },
                async (progress) => {
                    progressId = setInterval(() => {
                        if (progressIncrement <= 90) {
                            progress.report({ increment: incrementVal }); // increment by 0.4%
                            progressIncrement =
                                progressIncrement + incrementVal;
                        }
                    }, 100); // this will increment progress by 0.4% every 100 millisenconds

                    const prompt =
                        value === 'BTP Credential Store'
                            ? btpPrompt.replace('EXTENSION_TMP', extension)
                            : otherPrompt
                                  .replace(/EXTENSION_TMP/g, extension)
                                  .replace(/VALUE_TMP/g, value);

                    const aiResponse = await getAIResponse(prompt);

                    clearInterval(progressId); // stop increasing progress after we have the aiResponse

                    if (!aiResponse.success) {
                        handleError(aiResponse.message);
                    }

                    const doc =
                        value === 'BTP Credential Store'
                            ? btpDocumentation.replace(
                                  'CODE_TMP',
                                  aiResponse.message,
                              )
                            : aiResponse.message;

                    objDoc.content = `${beginHtml.replace(
                        'VALUE_TMP',
                        value,
                    )} ${doc} ${endHtml}`;

                    return objDoc;
                },
            );
        } catch (error) {
            clearInterval(progressId);
            handleError(error);
            return objDoc;
        }
    }
}
