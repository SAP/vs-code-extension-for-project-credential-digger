import {
    Diagnostic,
    DiagnosticCollection,
    DiagnosticSeverity,
    Range,
    TextDocument,
    Uri,
    window,
} from 'vscode';

import BinaryRunner from './client/runner/binary-runner';
import DockerRunner from './client/runner/docker-runner';
import Runner from './client/runner/runner';
import WebServerRunner from './client/runner/webserver-runner';
import LoggerFactory from './logger-factory';
import {
    CredentialDiggerRunner,
    CredentialDiggerRunnerBinaryConfig,
    CredentialDiggerRunnerDockerConfig,
    CredentialDiggerRunnerWebServerConfig,
    CredentialDiggerRuntime,
} from '../types/config';

export default class RunnerFactory {
    private runner: Runner;

    private constructor(runnerConfig: CredentialDiggerRunner) {
        switch (runnerConfig.type) {
            case CredentialDiggerRuntime.Docker:
                this.runner = new DockerRunner(
                    runnerConfig.docker as CredentialDiggerRunnerDockerConfig,
                    runnerConfig.type,
                );
                break;
            case CredentialDiggerRuntime.Binary:
                this.runner = new BinaryRunner(
                    runnerConfig.binary as CredentialDiggerRunnerBinaryConfig,
                    runnerConfig.type,
                );
                break;
            case CredentialDiggerRuntime.WebServer:
                this.runner = new WebServerRunner(
                    runnerConfig.webserver as CredentialDiggerRunnerWebServerConfig,
                    runnerConfig.type,
                );
                break;
            default:
                throw new Error('Failed to instantiate a command runner');
        }
    }

    public static getInstance(
        runnerConfig: CredentialDiggerRunner,
    ): RunnerFactory {
        return new RunnerFactory(runnerConfig);
    }

    public async scan(
        currentFile: TextDocument,
        storageUri: Uri,
        diagCollection: DiagnosticCollection,
    ) {
        this.runner.setCurrentFile(currentFile);
        LoggerFactory.getInstance().debug(
            `${this.getId()}: scan: start scanning file ${
                this.runner.getCurrentFile().uri.fsPath
            }`,
        );
        // Clear credential digger findings for current file
        diagCollection.delete(this.runner.getCurrentFile().uri);
        // Scan
        const numberOfDiscoveries = await this.runner.scan();
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
                    const range = new Range(
                        d.lineNumber - 1,
                        colStart,
                        d.lineNumber - 1,
                        colEnd,
                    );
                    const diag: Diagnostic = {
                        message,
                        range,
                        severity: DiagnosticSeverity.Warning,
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

    public async addRules(rules: string) {
        LoggerFactory.getInstance().debug(
            `${this.getId()}: addRules: start adding rules`,
        );
        // Validate & set rules
        this.runner.validateAndSetRules(rules);
        // Add rules
        const success = await this.runner.addRules();
        if (success) {
            window.showInformationMessage(
                `Scanning rules added successfully to the database (${this.getId()})`,
            );
        } else {
            window.showErrorMessage(
                `Failed to add the scanning rules to the database (${this.getId()})`,
            );
        }
        // Log end
        LoggerFactory.getInstance().debug(
            `${this.getId()}: addRules: end adding rules`,
        );
    }
}
