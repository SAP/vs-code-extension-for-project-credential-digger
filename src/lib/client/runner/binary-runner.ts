import { Discovery } from '../../../types/db';
import Runner from './runner';
import {
    CredentialDiggerRunnerBinaryConfig,
    DbType,
} from '../../../types/config';
import * as fs from 'fs';
import * as vscode from 'vscode';
import Utils from '../../utils';
import LoggerFactory from '../../logger-factory';
import {
    CredentialDiggerTaskDefinitionType,
    CredentialDiggerTaskGroup,
    CredentialDiggerTasks,
    TaskProblemMatcher,
} from '../../../types/task';

export default class BinaryRunner extends Runner {
    public async scan(): Promise<number> {
        this.config = this.config as CredentialDiggerRunnerBinaryConfig;
        // Prepare scan command
        let cmd = `${this.config.path} scan_path "${this.fileLocation.fsPath}" --models PathModel --force --debug`;
        if (this.config.databaseConfig.type === DbType.SQLite) {
            cmd += ` --sqlite "${this.config.databaseConfig.sqlite?.filename}"`;
        }
        LoggerFactory.getInstance().debug(
            `${this.getId()}: scan: command: ${cmd}`,
        );
        // Trigger
        const cmdShellExec = new vscode.ShellExecution(cmd);
        const triggerTask = new vscode.Task(
            {
                type: CredentialDiggerTaskDefinitionType.Scan,
                group: CredentialDiggerTaskGroup,
                scanId: this.getId(),
            },
            vscode.TaskScope.Workspace,
            CredentialDiggerTasks.scan.name,
            CredentialDiggerTasks.scan.description,
            cmdShellExec,
            TaskProblemMatcher.Shell,
        );
        const exitCode = await Utils.executeTask(triggerTask);
        LoggerFactory.getInstance().debug(
            `${this.getId()}: scan: exit code: ${exitCode}`,
        );
        return exitCode ?? 0;
    }

    public async getDiscoveries(storagePath: vscode.Uri): Promise<Discovery[]> {
        let discoveries: Discovery[] = [];
        this.config = this.config as CredentialDiggerRunnerBinaryConfig;
        // Save the discoveries file in the extension workspace
        if (!this.fileLocation) {
            return discoveries;
        }
        const filename =
            (await Utils.createHash(this.fileLocation.fsPath, 8)) + '.csv';
        this.discoveriesFileLocation = vscode.Uri.joinPath(
            storagePath,
            filename,
        );
        // Get discoveries
        let cmd = `${this.config.path} get_discoveries --with_rules --save "${this.discoveriesFileLocation.fsPath}" "${this.fileLocation.fsPath}"`;
        if (this.config.databaseConfig.type === DbType.SQLite) {
            cmd += ` --sqlite "${this.config.databaseConfig.sqlite?.filename}"`;
        }
        LoggerFactory.getInstance().debug(
            `${this.getId()}: getDiscoveries: command: ${cmd}`,
        );
        // Trigger
        const cmdShellExec = new vscode.ShellExecution(cmd);
        const triggerTask = new vscode.Task(
            {
                type: CredentialDiggerTaskDefinitionType.Discoveries,
                group: CredentialDiggerTaskGroup,
                scanId: this.getId(),
            },
            vscode.TaskScope.Workspace,
            CredentialDiggerTasks.discoveries.name,
            CredentialDiggerTasks.discoveries.description,
            cmdShellExec,
            TaskProblemMatcher.Shell,
        );
        const exitCode = await Utils.executeTask(triggerTask);
        LoggerFactory.getInstance().debug(
            `${this.getId()}: getDiscoveries: exit code: ${exitCode}`,
        );
        if (exitCode && exitCode > 0) {
            // Parse result file
            discoveries = await Utils.parseDiscoveriesCSVFile(
                this.discoveriesFileLocation.fsPath,
            );
        }
        return discoveries;
    }

    public async cleanup(): Promise<void> {
        // Cleanup the discoveries file
        if (this.discoveriesFileLocation) {
            await fs.promises.rm(this.discoveriesFileLocation.fsPath);
        }
    }

    protected validateConfig(): void {
        super.validateConfig();
        this.config = this.config as CredentialDiggerRunnerBinaryConfig;
        if (!this.config.path) {
            throw new Error('Please provide the Credential Digger location');
        }

        if (!fs.existsSync(this.config.path)) {
            throw new Error(
                'Please provide a valid Credential Digger location',
            );
        }
    }

    public async addRules(): Promise<boolean> {
        if (!this.rules) {
            return true;
        }
        this.config = this.config as CredentialDiggerRunnerBinaryConfig;
        let cmd = `${this.config.path} add_rules "${this.rules?.fsPath}"`;
        if (this.config.databaseConfig.type === DbType.SQLite) {
            cmd += ` --sqlite "${this.config.databaseConfig.sqlite?.filename}"`;
        } else if (this.config.databaseConfig.type === DbType.Postgres) {
            cmd += ` --dotenv "${this.config.databaseConfig.postgres?.envFile}"`;
        }
        LoggerFactory.getInstance().debug(
            `${this.getId()}: addRules: command: ${cmd}`,
        );
        // Trigger
        const cmdShellExec = new vscode.ShellExecution(cmd);
        const triggerTask = new vscode.Task(
            {
                type: CredentialDiggerTaskDefinitionType.AddRules,
                group: CredentialDiggerTaskGroup,
                scanId: this.getId(),
            },
            vscode.TaskScope.Workspace,
            CredentialDiggerTasks.addRules.name,
            CredentialDiggerTasks.addRules.description,
            cmdShellExec,
            TaskProblemMatcher.Shell,
        );
        const exitCode = await Utils.executeTask(triggerTask);
        LoggerFactory.getInstance().debug(
            `${this.getId()}: addRules: exit code: ${exitCode}`,
        );
        return exitCode === 0;
    }

    public setCurrentFile(currentFile: vscode.TextDocument) {
        super.setCurrentFile(currentFile);
        this.fileLocation = (this.currentFile as vscode.TextDocument).uri;
    }
}
