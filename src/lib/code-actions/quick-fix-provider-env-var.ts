import { existsSync, promises as fs } from 'fs';
import { join, extname, relative } from 'path';
import {
    window,
    workspace,
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
    Position,
    TextEditor,
    ProgressLocation,
} from 'vscode';

import { languagesOpts, promptEnvVar } from './data';
import { ProjectType, LanguageOptions, Languages } from '../../types/quickFix';
import {
    findSecretToReplace,
    generateUniqNumber,
    getAIResponse,
    getEdit,
    getEditor,
    handleError,
} from '../utils';

/**
 * QuickFixProviderEnvVar class provides the code actions for creating environment variables.
 *
 * @param pathRoot - The root path of the workspace.
 * @param projectType - The project type. Can be 'opt_1' or 'opt_2'. Opt_1 is the default value.
 */
export class QuickFixProviderEnvVar implements CodeActionProvider {
    private diagnosticCollection: DiagnosticCollection;
    private pathRoot: string;
    private projectType: ProjectType;

    constructor(diagnosticCollection: DiagnosticCollection) {
        this.diagnosticCollection = diagnosticCollection;
        this.pathRoot = this.getRootPath();
        this.projectType = ProjectType.Opt1;
    }

    public static readonly providedCodeActionKinds = [CodeActionKind.QuickFix];

    /**
     * Register the command for creating environment variables.
     */
    registerCommands(): Disposable {
        return commands.registerCommand(
            'vs-code-extension-for-project-credential-digger.create-env-var',
            (action, diagnostic, snippet, match) =>
                this.executeCodeAction(action, diagnostic, snippet, match),
        );
    }

    /**
     * Provide the code actions for creating environment variables.
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
     * Handle the diagnostic and create the code action for creating environment variables.
     */
    handleDiagnostic(
        diagnostic: Diagnostic,
        range: Range | Selection,
        codeActions: CodeAction[],
    ): void {
        if (diagnostic.range.intersection(range)) {
            const action = new CodeAction(
                'Create Environment Variable',
                CodeActionKind.QuickFix,
            );
            action.diagnostics = [diagnostic];

            // const regex = /[:=]\s*[\W]\s*["'`]?(.*?)["'`]/i;
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
            action.edit = new WorkspaceEdit();
            action.command = {
                command:
                    'vs-code-extension-for-project-credential-digger.create-env-var',
                title: 'Create Environment Variable',
                arguments: [action, diagnostic, snippet, secret],
            };
            codeActions.push(action);
        }
    }

    /**
     * Execute the code action for creating environment variables.
     *
     * @param snippet - The snippet of the secret. Corresponds to the line on the code where the secret is used.
     */
    async executeCodeAction(
        action: CodeAction,
        diagnostic: Diagnostic,
        snippet: string,
        secretMatch: string,
    ) {
        try {
            const editor = getEditor();
            const edit = getEdit(action);
            const uri = editor.document.uri;
            const extension = extname(uri.fsPath); // get the extension of the file. ex: '.java'
            // get the language options for the extension of the file.
            // ex: { '.java': { opt_1: { dep: '', imp: '', init: '', use: '', tag: '' }, opt_2: { dep: '', imp: '', init: '', use: '', tag: '' } }
            const allOptions = this.getOptions(extension as keyof Languages);

            if (allOptions && secretMatch) {
                // if the language options are found
                const randSecretName = this.generateRandomSecretName();
                const secretValue = this.getSecret(secretMatch); // prepare the secret
                const pathEnv = this.addSecretToEnvFile(
                    secretValue,
                    randSecretName,
                );
                await this.addDependency(allOptions, extension);
                this.updateCodes(
                    editor,
                    edit,
                    diagnostic,
                    snippet,
                    uri,
                    secretMatch,
                    randSecretName,
                    allOptions,
                );
                if (pathEnv) {
                    await this.addEnvFileToGitignoreFile(pathEnv);
                }
            } else {
                // if the language options are not found, we call the AI
                await this.callAI(edit, diagnostic, uri, extension);
            }
            workspace.applyEdit(edit); // apply the changes to the document
        } catch (error) {
            handleError(error);
        }
    }

    /**
     * Get the language options from the languages json file.
     *
     * @param extension - The extension of the file, which is the key to get the language options on the json file.
     */
    getOptions(extension: keyof Languages) {
        const allOptions = languagesOpts[extension];

        if (allOptions) {
            if (extension === '.java') {
                if (this.isMavenProject()) {
                    // if it is not a java maven project, then we will call ai
                    return allOptions;
                }
            } else {
                return allOptions;
            }
        }
        return undefined;
    }

    /**
     * Call the AI to get the instructions for creating environment variables.
     */
    async callAI(
        edit: WorkspaceEdit,
        diagnostic: Diagnostic,
        uri: Uri,
        extension: string,
    ) {
        await window.withProgress(
            {
                location: ProgressLocation.Notification,
                title: '⛏️ Credential Digger: 🤖 Wait! We are calling an AI for you. 🤖',
                cancellable: false,
            },
            async (progress) => {
                let progressId;
                let progressIncrement = 0;
                const incrementVal = 0.4;

                try {
                    progressId = setInterval(() => {
                        if (progressIncrement <= 90) {
                            progress.report({ increment: incrementVal }); // increment by 0.4%
                            progressIncrement =
                                progressIncrement + incrementVal;
                        }
                    }, 100); // this will increment progress by 0.4% every 100 millisenconds

                    const prompt = promptEnvVar.replace(
                        /EXTENSION_TMP/g,
                        extension,
                    );
                    const response = await getAIResponse(prompt);

                    clearInterval(progressId); // stop increasing progress after we have the aiResponse

                    if (response.success === true) {
                        // insert the instructions from the AI to the document
                        edit.insert(
                            uri,
                            new Position(diagnostic.range.end.line + 1, 0),
                            '\n' + response.message + '\n\n',
                        );
                    } else {
                        handleError(response.message);
                    }
                } catch (error) {
                    handleError(error);
                }
            },
        );
    }

    /**
     * Get the secret value. Remove the quotes and spaces from the secret found in the code.
     */
    getSecret(secretOld: string) {
        let secret = secretOld.replace(/ /g, ''); // remove all spaces
        secret = secret.substring(1, secret.length - 1); // remove the quotes

        return secret;
    }

    /**
     * Update the code with the new way of using the secret.
     */
    updateCodes(
        editor: TextEditor,
        edit: WorkspaceEdit,
        diagnostic: Diagnostic,
        snippet: string,
        uri: Uri,
        secret: string,
        randSecret: string,
        allOptions: LanguageOptions,
    ) {
        const objConf = allOptions[this.projectType]; // get the language option for the project type. ex: { dep: '', imp: '', init: '', use: '', tag: '' }
        const newLineUse = snippet
            .replace(secret, objConf.use.replace('SECRET_TMP', randSecret))
            .replace(/^\s+/gm, '');
        const positionImport = this.findPatternPosition(
            editor.document,
            objConf.tag,
        ); // find the position to insert the import(s)
        // const positionTag = positionImport.line === 0 ? positionImport : new Position(positionImport.line + 1, 0);
        const indentationImport = this.getIndentation(editor, positionImport);
        const newLineImport = objConf.imp.replace(
            /IDT_TMP/g,
            indentationImport,
        );
        edit.replace(uri, diagnostic.range, newLineUse); // replace the old way of using the secret with the new one

        const positionInit = this.findInitPosition(editor, diagnostic); // find the position to insert the initialization code
        const indentationInit = this.getIndentation(editor, positionInit);
        const newLineInit = objConf.init
            .replace('SECRET_TMP', randSecret)
            .replace(/IDT_TMP/g, indentationInit);

        edit.insert(uri, positionImport, newLineImport); // insert import(s) at the top of the file
        edit.insert(uri, positionInit, newLineInit); // insert initialization code
    }

    /**
     * Find the position to insert the initialization code.
     */
    findInitPosition(editor: TextEditor, diagnostic: Diagnostic) {
        const document = editor.document;
        const uri = document.uri;
        const lineStart = diagnostic.range.start.line;

        // if the file is a java from a non maven project, we need to do something different in that case
        if (extname(uri.fsPath) === '.java') {
            if (!this.isMavenProject()) {
                return this.findInitPositionForNoneMavenProject(
                    document,
                    lineStart,
                );
            }
        }

        return this.findInitPositionForOtherProject(document, lineStart);
    }

    /**
     * Find the position to insert the initialization code for a non maven java project.
     * Need to find the closing brace to insert the initialization code before it.
     * The initialization code will be a method to read a file and return a string.
     */
    findInitPositionForNoneMavenProject(
        document: TextDocument,
        lineStart: number,
    ) {
        let foundClosingBrace = false;
        let lastLine = document.lineCount - 1;

        while (lastLine >= 0) {
            const line = document.lineAt(lastLine).text.trim();

            if (line === '}') {
                foundClosingBrace = true;
                break;
            }
            lastLine--;
        }
        if (foundClosingBrace) {
            return new Position(lastLine, 0);
        }
        return new Position(lineStart, 0); // default position -> beginning of the file
    }

    /**
     * Find the position to insert the initialization code for other languages.
     * Need to understand the context on how the secret is actually used in the code.
     * Could be in an object, an array, in a parameter of a function called or a basic variable definition.
     * Then decide where to insert the initialization code.
     *
     * @param document - The text document.
     * @param lineStart - The line number where the secret is used.
     */
    findInitPositionForOtherProject(document: TextDocument, lineStart: number) {
        const line = document.lineAt(lineStart).text; // equivalent to the snippet value
        const uri = document.uri;

        // check if the secret is used while declaring a variable
        if (
            line.match(/[a-zA-Z0-9_]*\s*=/) &&
            !line.includes('=>') &&
            extname(uri.fsPath) !== '.cs' &&
            !line.includes(';')
        ) {
            // if there is something before the = sign but not => sign
            return new Position(lineStart, 0); // insert before the variable definition
        } else {
            // then assuming that the secret is used in an object or an array
            let i = lineStart - 1;
            let isArrayOrObject = false;
            let equalFound = false;
            while (i >= 0) {
                // Loop upper until we find the start of the object or array { or [
                const line = document.lineAt(i).text;
                if (line.match(/[{[]/)) {
                    isArrayOrObject = true;
                }
                if (isArrayOrObject && line.match(/=/)) {
                    // try to find the equal sign
                    equalFound = true;
                }
                if (equalFound && line.match(/[a-zA-Z0-9_]/)) {
                    // try to find the variable name of the array / object
                    return new Position(i, 0); // insert before the object declaration
                }
                i--;
            }
            return new Position(lineStart, 0); // insert before the object or array
        }
    }

    /**
     * Find the position to insert the code.
     * The 'tag' value is the pattern to find in the document to insert the code after it.
     * the 'tag' value is different for each language, or could be ''.
     *
     * @param document - The text document.
     * @param pattern - The pattern to find in the document.
     */
    findPatternPosition(document: TextDocument, pattern: string) {
        if (pattern === '') {
            return new Position(0, 0);
        }
        for (let i = 0; i < document.lineCount; i++) {
            const line = document
                .lineAt(i)
                .text.replace(new RegExp(`\\s`, 'g'), ''); // remove all spaces
            if (line.startsWith(pattern)) {
                return new Position(i + 1, 0); // add after the pattern found
            }
        }
        return new Position(0, 0);
    }

    /**
     * Add the dependency to the project.
     * this function decides if the project is a java maven project or not. And how to install the dependency.
     * Could be a dependency added from the terminal or from the pom.xml file.
     *
     * @param allOptions - The language options.
     * ex: { '.java': { opt_1: { dep: '', imp: '', init: '', use: '', tag: '' }, opt_2: { dep: '', imp: '', init: '', use: '', tag: '' } }
     * @param extension - The extension of the file.
     * ex: '.java'
     */
    async addDependency(allOptions: LanguageOptions, extension: string) {
        try {
            if (extension !== '.java') {
                await this.addOtherDependency(allOptions);
                return;
            }

            if (this.isMavenProject()) {
                // if the file is a java maven project
                await this.addJavaMavenDependency(allOptions);
            }
            /*else { // a java not maven project, we just call the AI to give advice
                this.projectType = ProjectType.Opt2; // switch to the second option for java projects
                await this.addOtherDependency(allOptions); 
            }*/
        } catch (error) {
            handleError(error);
        }
    }

    /**
     * Add the dependency to the pom.xml file.
     *
     * @param allOptions - The language options.
     * ex: { '.java': { opt_1: { dep: '', imp: '', init: '', use: '', tag: '' }, opt_2: { dep: '', imp: '', init: '', use: '', tag: '' } }
     */
    async addJavaMavenDependency(allOptions: LanguageOptions) {
        try {
            const pathPomFile = join(this.pathRoot, 'pom.xml');
            const dataPomFile = await fs.readFile(pathPomFile);
            const contentPomFile = dataPomFile.toString();

            if (!contentPomFile.includes('dotenv')) {
                // if the dependency is not already added
                const newContentPomFile = contentPomFile.replace(
                    '</dependencies>',
                    allOptions[this.projectType].dep,
                );
                fs.writeFile(pathPomFile, newContentPomFile).then(() => {
                    // preview: false -> means to fully open the file on the editor. true by default -> means to open the file in a preview mode.
                    window.showTextDocument(Uri.file(pathPomFile), {
                        preview: false,
                    });
                    window.showInformationMessage(
                        '⛏️ Credential Digger: Dependency added to the pom.xml file.',
                    );
                });
            }
        } catch (error) {
            handleError(error);
        }
    }

    /**
     * Add other type of dependency to the project.
     *
     * @param allOptions - The language options.
     * ex: { '.php': { opt_1: { dep: '', imp: '', init: '', use: '', tag: '' } }
     */
    async addOtherDependency(allOptions: LanguageOptions) {
        try {
            const dep = allOptions[this.projectType].dep;
            if (dep) {
                // ask the user if they want to install the dependency
                const message =
                    '⛏️ Credential Digger: Need to install "' +
                    dep +
                    '" to use the secret.';
                const response = await window.showWarningMessage(
                    message,
                    { modal: true },
                    'Yes',
                );

                if (response === 'Yes') {
                    // if the user wants to install the dependency
                    const terminal = window.createTerminal({
                        name: 'Dependency Installation',
                        cwd: this.pathRoot, // where to start the terminal
                    });
                    terminal.sendText(dep);
                    terminal.show(); // show the terminal to the user
                } else {
                    // if not, show a warning message to let them know that the dependency is not installed and will not be able to use the secret
                    window.showWarningMessage(
                        '⛏️ Credential Digger: Need to install "' +
                            dep +
                            '" to use the secret.',
                    );
                }
            }
        } catch (error) {
            handleError(error);
        }
    }

    /**
     * Add the secret to the .env file.
     * Check if the .env file exists:
     * If yes, add the secret to it.
     * If not, create the .env file and add the secret to it.
     *
     * @param secret - The secret value.
     * @param randSecret - The random secret name: SECRET_XXX
     */
    addSecretToEnvFile(secret: string, randSecret: string) {
        try {
            const uriEnvFile = Uri.file(join(this.pathRoot, '.env'));
            const textBuffer = new Uint8Array(
                Buffer.from('\n' + randSecret + '=' + secret),
            );
            if (existsSync(uriEnvFile.fsPath)) {
                fs.appendFile(uriEnvFile.fsPath, textBuffer).then(() => {
                    window.showInformationMessage(
                        '⛏️ Credential Digger: Secret added to the existing .env file.',
                    );
                    // preview: false -> means to fully open the file on the editor. true by default -> means to open the file in a preview mode.
                    window.showTextDocument(uriEnvFile, { preview: false });
                });
            } else {
                fs.writeFile(uriEnvFile.fsPath, textBuffer).then(() => {
                    window.showInformationMessage(
                        '⛏️ Credential Digger: .env file created.',
                    );
                    // preview: false -> means to fully open the file on the editor. true by default -> means to open the file in a preview mode.
                    window.showTextDocument(uriEnvFile, { preview: false });
                });
            }
            return uriEnvFile;
        } catch (error) {
            handleError(error);
            return null;
        }
    }

    /**
     * Add the .env file to the .gitignore file.
     * Check if the .gitignore file exists:
     * If yes, add the .env file to it.
     * If not, create the .gitignore file and add the .env file to it.
     */
    async addEnvFileToGitignoreFile(uriEnvFile: Uri) {
        try {
            const pathGitignoreFile = join(this.pathRoot, '.gitignore');
            const rltvPathEnvFile = relative(this.pathRoot, uriEnvFile.fsPath);

            if (existsSync(pathGitignoreFile)) {
                const dataGitignoreFile = await fs.readFile(pathGitignoreFile);
                const contentGitignoreFile = dataGitignoreFile.toString();

                if (!contentGitignoreFile.includes(rltvPathEnvFile)) {
                    fs.appendFile(
                        pathGitignoreFile,
                        '\n' + rltvPathEnvFile,
                    ).then(() => {
                        // preview: false -> means to fully open the file on the editor. true by default -> means to open the file in a preview mode.
                        window.showTextDocument(Uri.file(pathGitignoreFile), {
                            preview: false,
                        });
                        window.showInformationMessage(
                            '⛏️ Credential Digger: .env path added to the exisitng .gitignore file.',
                        );
                    });
                }
            } else {
                const newLine = new Uint8Array(
                    Buffer.from(rltvPathEnvFile + '\n'),
                );
                const uriGitignoreFile = Uri.file(pathGitignoreFile);

                workspace.fs.writeFile(uriGitignoreFile, newLine).then(() => {
                    window.showInformationMessage(
                        '⛏️ Credential Digger: .gitignore file created.',
                    );
                    // preview: false -> means to fully open the file on the editor. true by default -> means to open the file in a preview mode.
                    window.showTextDocument(uriGitignoreFile, {
                        preview: false,
                    });
                });
            }
        } catch (error) {
            handleError(error);
        }
    }

    /**
     * Get the root path of the workspace.
     */
    getRootPath() {
        if (
            workspace.workspaceFolders &&
            workspace.workspaceFolders.length > 0
        ) {
            return workspace.workspaceFolders[0].uri.fsPath;
        }
        throw new Error('No workspace open.');
    }

    /**
     * Get the indentation of the line.
     * Will be used to keep the same indentation when inserting code.
     */
    getIndentation(editor: TextEditor, position: Position) {
        const line = editor.document.lineAt(position.line).text;
        return line.substring(0, line.indexOf(line.trim()));
    }

    /**
     * Generate a random secret name with 3 digits.
     * ex: SECRET_123 (but more random)
     */
    generateRandomSecretName(): string {
        // const randNum = Math.floor(Math.random() * 900) + 100;
        const randNum = generateUniqNumber();
        return 'SECRET_' + randNum.toString();
    }

    /**
     * Check if the project is a maven project.
     */
    isMavenProject() {
        const pathPomFile = join(this.pathRoot, 'pom.xml');
        return existsSync(pathPomFile);
    }
}
