import {
    CredentialDiggerRunner,
    CredentialDiggerRunnerBinaryConfig,
    CredentialDiggerRunnerDockerConfig,
    CredentialDiggerRunnerWebServerConfig,
    CredentialDiggerRuntime,
} from '../types/config';
import BinaryRunner from './client/runner/binary-runner';
import Runner from './client/runner/runner';
import DockerRunner from './client/runner/docker-runner';
import * as vscode from 'vscode';
import LoggerFactory from './logger-factory';
import WebServerRunner from './client/runner/webserver-runner';

export default class RunnerFactory {
    private runner: Runner;

    private constructor(
        runnerConfig: CredentialDiggerRunner,
        rules: string,
        currentFile?: vscode.TextDocument,
    ) {
        switch (runnerConfig.type) {
            case CredentialDiggerRuntime.Docker:
                this.runner = new DockerRunner(
                    runnerConfig.docker as CredentialDiggerRunnerDockerConfig,
                    runnerConfig.type,
                    rules,
                    currentFile,
                );
                break;
            case CredentialDiggerRuntime.Binary:
                this.runner = new BinaryRunner(
                    runnerConfig.binary as CredentialDiggerRunnerBinaryConfig,
                    runnerConfig.type,
                    rules,
                    currentFile,
                );
                break;
            case CredentialDiggerRuntime.WebServer:
                this.runner = new WebServerRunner(
                    runnerConfig.webserver as CredentialDiggerRunnerWebServerConfig,
                    runnerConfig.type,
                    rules,
                    currentFile,
                );
                break;
            default:
                throw new Error('Failed to instantiate a command runner');
        }
    }

    public static getInstance(
        runnerConfig: CredentialDiggerRunner,
        rules: string,
        currentFile?: vscode.TextDocument,
    ): RunnerFactory {
        return new RunnerFactory(runnerConfig, rules, currentFile);
    }

    public async scan(
        storageUri: vscode.Uri,
        diagCollection: vscode.DiagnosticCollection,
    ) {
        LoggerFactory.getInstance().debug(
            `${this.getId()}: scan: start scanning file ${
                this.runner.getCurrentFile().uri.fsPath
            }`,
        );
        // Clear credential digger findings for current file
        diagCollection.delete(this.runner.getCurrentFile().uri);
        // Scan
        const numberOfDiscoveries = await this.runner.run();
        // Get discoveries
        if (numberOfDiscoveries > 0) {
            const discoveries = await this.runner.getDiscoveries(storageUri);
            if (discoveries) {
                // Push to diag collection
                const diags = [];
                for (const d of discoveries) {
                    const colStart = this.runner
                        .getCurrentFile()
                        .lineAt(d.lineNumber - 1)
                        .text.indexOf(d.snippet);
                    const colEnd =
                        (colStart > 0 ? colStart : 0) + d.snippet.length;
                    const message = `Credential detected".
                    \nSnippet: "${d.snippet}"
                    \nRule: "${d.rule?.regex}"
                    \nCategory: "${d.rule?.category}"`;
                    const range = new vscode.Range(
                        d.lineNumber - 1,
                        colStart,
                        d.lineNumber - 1,
                        colEnd,
                    );
                    const diag: vscode.Diagnostic = {
                        message,
                        range,
                        severity: vscode.DiagnosticSeverity.Warning,
                        source: 'CredentialDigger',
                    };
                    diags.push(diag);
                }
                diagCollection.set(this.runner.getCurrentFile().uri, diags);
            }
        }
        // Cleanup
        await this.runner.cleanup();
        // Log end
        LoggerFactory.getInstance().debug(
            `${this.getId()}: scan: end scanning file ${
                this.runner.getCurrentFile().uri.fsPath
            }`,
        );
    }

    public getId() {
        return this.runner.getId();
    }

    public async addRules() {
        LoggerFactory.getInstance().debug(
            `${this.getId()}: addRules: start adding rules`,
        );
        // Add rules
        const success = await this.runner.addRules();
        if (success) {
            vscode.window.showInformationMessage(
                `Scanning rules added successfully to the database (${this.getId()})`,
            );
        } else {
            vscode.window.showErrorMessage(
                `Failed to add the scanning rules to the database (${this.getId()})`,
            );
        }
        // Log end
        LoggerFactory.getInstance().debug(
            `${this.getId()}: addRules: end adding rules`,
        );
    }
}
