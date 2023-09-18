import { existsSync, rmSync } from 'fs';
import { ShellExecution, Task, TaskScope, TextDocument, Uri } from 'vscode';

import Runner from './runner';
import {
    CredentialDiggerRunnerBinaryConfig,
    DbType,
} from '../../../types/config';
import { Discovery } from '../../../types/db';
import {
    CredentialDiggerTaskDefinitionAction,
    CredentialDiggerTaskDefinitionType,
    CredentialDiggerTaskGroup,
    CredentialDiggerTasks,
} from '../../../types/task';
import LoggerFactory from '../../logger-factory';
import { createHash, executeTask, parseDiscoveriesCSVFile } from '../../utils';

export default class BinaryRunner extends Runner {
    public async scan(): Promise<number> {
        this.config = this.config as CredentialDiggerRunnerBinaryConfig;
        // Prepare scan command
        let cmd = `${this.config.path} scan_path "${this.fileLocation.fsPath}" --models PathModel PasswordModel --force --debug`;
        if (this.config.databaseConfig.type === DbType.SQLite) {
            cmd += ` --sqlite "${this.config.databaseConfig.sqlite?.filename}"`;
        }
        LoggerFactory.getInstance().debug(`scan: command: ${cmd}`, {
            correlationId: this.getId(),
        });
        // Trigger
        const cmdShellExec = new ShellExecution(cmd);
        const triggerTask = new Task(
            {
                type: CredentialDiggerTaskDefinitionType.Shell,
                action: CredentialDiggerTaskDefinitionAction.Scan,
                group: CredentialDiggerTaskGroup,
                scanId: this.getId(),
            },
            TaskScope.Workspace,
            CredentialDiggerTasks.scan.name,
            CredentialDiggerTasks.scan.description,
            cmdShellExec,
        );
        const exitCode = await executeTask(triggerTask);
        LoggerFactory.getInstance().debug(`scan: exit code: ${exitCode}`, {
            correlationId: this.getId(),
        });
        return exitCode ?? 0;
    }

    public async getDiscoveries(storagePath: Uri): Promise<Discovery[]> {
        let discoveries: Discovery[] = [];
        this.config = this.config as CredentialDiggerRunnerBinaryConfig;
        // Save the discoveries file in the extension workspace
        if (!this.fileLocation) {
            return discoveries;
        }
        const filename = createHash(this.fileLocation.fsPath, 8) + '.csv';
        this.discoveriesFileLocation = Uri.joinPath(storagePath, filename);
        // Get discoveries
        let cmd = `${this.config.path} get_discoveries --with_rules --save "${this.discoveriesFileLocation.fsPath}" "${this.fileLocation.fsPath}"`;
        if (this.config.databaseConfig.type === DbType.SQLite) {
            cmd += ` --sqlite "${this.config.databaseConfig.sqlite?.filename}"`;
        }
        LoggerFactory.getInstance().debug(`getDiscoveries: command: ${cmd}`, {
            correlationId: this.getId(),
        });
        // Trigger
        const cmdShellExec = new ShellExecution(cmd);
        const triggerTask = new Task(
            {
                type: CredentialDiggerTaskDefinitionType.Shell,
                action: CredentialDiggerTaskDefinitionAction.Discoveries,
                group: CredentialDiggerTaskGroup,
                scanId: this.getId(),
            },
            TaskScope.Workspace,
            CredentialDiggerTasks.discoveries.name,
            CredentialDiggerTasks.discoveries.description,
            cmdShellExec,
        );
        const exitCode = await executeTask(triggerTask);
        LoggerFactory.getInstance().debug(
            `getDiscoveries: exit code: ${exitCode}`,
            { correlationId: this.getId() },
        );
        if (exitCode && exitCode > 0) {
            // Parse result file
            discoveries = await parseDiscoveriesCSVFile(
                this.discoveriesFileLocation.fsPath,
            );
        }
        return discoveries;
    }

    public async cleanup(): Promise<void> {
        // Cleanup the discoveries file
        if (this.discoveriesFileLocation) {
            rmSync(this.discoveriesFileLocation.fsPath);
        }
    }

    protected validateConfig(): void {
        super.validateConfig();
        this.config = this.config as CredentialDiggerRunnerBinaryConfig;
        if (!this.config.path) {
            throw new Error('Please provide the Credential Digger location');
        }

        if (!existsSync(this.config.path)) {
            throw new Error(
                'Please provide a valid Credential Digger location',
            );
        }
    }

    public async addRules(): Promise<boolean> {
        if (!this.rules) {
            return false;
        }
        this.config = this.config as CredentialDiggerRunnerBinaryConfig;
        let cmd = `${this.config.path} add_rules "${this.rules?.fsPath}"`;
        if (this.config.databaseConfig.type === DbType.SQLite) {
            cmd += ` --sqlite "${this.config.databaseConfig.sqlite?.filename}"`;
        } else if (this.config.databaseConfig.type === DbType.Postgres) {
            cmd += ` --dotenv "${this.config.databaseConfig.postgres?.envFile}"`;
        }
        LoggerFactory.getInstance().debug(`addRules: command: ${cmd}`, {
            correlationId: this.getId(),
        });
        // Trigger
        const cmdShellExec = new ShellExecution(cmd);
        const triggerTask = new Task(
            {
                type: CredentialDiggerTaskDefinitionType.Shell,
                action: CredentialDiggerTaskDefinitionAction.AddRules,
                group: CredentialDiggerTaskGroup,
                scanId: this.getId(),
            },
            TaskScope.Workspace,
            CredentialDiggerTasks.addRules.name,
            CredentialDiggerTasks.addRules.description,
            cmdShellExec,
        );
        const exitCode = await executeTask(triggerTask);
        LoggerFactory.getInstance().debug(`addRules: exit code: ${exitCode}`, {
            correlationId: this.getId(),
        });
        return exitCode === 0;
    }

    public setCurrentFile(currentFile: TextDocument) {
        super.setCurrentFile(currentFile);
        this.fileLocation = (this.currentFile as TextDocument).uri;
    }
}
