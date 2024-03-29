import { rmSync } from 'fs';
import { dirname } from 'path';
import { ShellExecution, Task, TaskScope, TextDocument, Uri } from 'vscode';

import Runner from './runner';
import {
    CredentialDiggerRunnerDockerConfig,
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

export default class DockerRunner extends Runner {
    private containerWorkingDir = '/data/credentialDigger';
    private discoveriesLocalFileLocation!: Uri;

    public async scan(): Promise<number> {
        const commands = [];
        this.config = this.config as CredentialDiggerRunnerDockerConfig;

        // Copy to a temporary folder within the container
        commands.push(
            `docker exec "${this.config.containerId}" mkdir -p "${dirname(
                this.fileLocation.fsPath,
            )}"`,
        );
        commands.push(
            `docker cp "${(this.currentFile as TextDocument).uri.fsPath}" "${
                this.config.containerId
            }:${this.fileLocation.fsPath}"`,
        );

        // Scan
        let scanCmd = `docker exec "${this.config.containerId}" credentialdigger scan_path "${this.fileLocation.fsPath}" --models PathModel PasswordModel --force --debug`;
        if (this.config.databaseConfig.type === DbType.SQLite) {
            scanCmd += ` --sqlite "${this.config.databaseConfig.sqlite?.filename}"`;
        }
        commands.push(scanCmd);
        LoggerFactory.getInstance().debug(
            `scan: command: ${commands[commands.length - 1]}`,
            { correlationId: this.getId() },
        );

        // Trigger
        const cmdShellExec = new ShellExecution(`${commands.join(' && ')}`);
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

        let exitCode = await executeTask(triggerTask);
        LoggerFactory.getInstance().debug(`scan: exit code: ${exitCode}`, {
            correlationId: this.getId(),
        });
        // For tasks exit code 127 is reserved for command not found
        if (exitCode === 127) {
            exitCode = -127;
        }
        return exitCode ?? 0;
    }

    public async getDiscoveries(storagePath: Uri): Promise<Discovery[]> {
        let discoveries: Discovery[] = [];
        const commands = [];
        this.config = this.config as CredentialDiggerRunnerDockerConfig;

        // Get discoveries
        if (!this.fileLocation) {
            return discoveries;
        }
        const filename = createHash(this.fileLocation.fsPath, 8) + '.csv';
        this.discoveriesLocalFileLocation = Uri.joinPath(storagePath, filename);
        this.discoveriesFileLocation = Uri.joinPath(
            Uri.parse(this.containerWorkingDir),
            filename,
        );

        let cmd = `docker exec "${this.config.containerId}" credentialdigger get_discoveries --with_rules --save "${this.discoveriesFileLocation.fsPath}" "${this.fileLocation.fsPath}"`;
        if (this.config.databaseConfig.type === DbType.SQLite) {
            cmd += ` --sqlite "${this.config.databaseConfig.sqlite?.filename}"`;
        }
        commands.push(cmd);
        LoggerFactory.getInstance().debug(
            `getDiscoveries: command: ${commands[commands.length - 1]}`,
            { correlationId: this.getId() },
        );

        // Copy discoveries file to extension workspace
        commands.push(
            `docker cp "${this.config.containerId}:${this.discoveriesFileLocation.fsPath}" "${this.discoveriesLocalFileLocation.fsPath}"`,
        );

        // Trigger
        const cmdShellExec = new ShellExecution(`${commands.join('; ')}`);
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
        if (exitCode === 0) {
            // Parse result file
            discoveries = await parseDiscoveriesCSVFile(
                this.discoveriesLocalFileLocation.fsPath,
            );
        }
        return discoveries;
    }

    public async cleanup(): Promise<void> {
        this.config = this.config as CredentialDiggerRunnerDockerConfig;
        const commands = [];
        if (this.fileLocation?.fsPath) {
            commands.push(
                `docker exec "${this.config.containerId}" rm -f "${this.fileLocation.fsPath}"`,
            );
        }
        if (this.discoveriesFileLocation?.fsPath) {
            commands.push(
                `docker exec "${this.config.containerId}" rm -f "${this.discoveriesFileLocation.fsPath}"`,
            );
        }
        // Cleanup
        if (commands) {
            const triggerTask = new Task(
                {
                    type: CredentialDiggerTaskDefinitionType.Shell,
                    action: CredentialDiggerTaskDefinitionAction.Cleanup,
                    group: CredentialDiggerTaskGroup,
                    scanId: this.getId(),
                },
                TaskScope.Workspace,
                CredentialDiggerTasks.cleanup.name,
                CredentialDiggerTasks.cleanup.description,
                new ShellExecution(`${commands.join('; ')}`),
            );
            const exitCode = await executeTask(triggerTask);
            LoggerFactory.getInstance().debug(
                `cleanup: exit code: ${exitCode}`,
                { correlationId: this.getId() },
            );
        }

        // Cleanup the discoveries file
        if (this.discoveriesLocalFileLocation) {
            rmSync(this.discoveriesLocalFileLocation.fsPath);
        }
    }

    protected validateConfig() {
        super.validateConfig();
        this.config = this.config as CredentialDiggerRunnerDockerConfig;
        if (!this.config.containerId) {
            throw new Error('Please provide a containerId');
        }
    }

    public async addRules(): Promise<boolean> {
        if (!this.rules) {
            return false;
        }
        const commands = [];
        this.config = this.config as CredentialDiggerRunnerDockerConfig;
        const rulesFileLocation = Uri.joinPath(
            Uri.parse(this.containerWorkingDir),
            this.rules.fsPath,
        );
        // Copy to container
        let cmd = `docker exec "${this.config.containerId}" mkdir -p "${dirname(
            rulesFileLocation.fsPath,
        )}"`;
        commands.push(cmd);
        cmd = `docker cp "${this.rules?.fsPath}" "${this.config.containerId}:${rulesFileLocation.fsPath}"`;
        commands.push(cmd);
        // Add rules
        cmd = `docker exec "${this.config.containerId}" credentialdigger add_rules "${rulesFileLocation.fsPath}"`;
        if (this.config.databaseConfig.type === DbType.SQLite) {
            cmd += ` --sqlite "${this.config.databaseConfig.sqlite?.filename}"`;
        } else if (this.config.databaseConfig.type === DbType.Postgres) {
            cmd += ` --dotenv "${this.config.databaseConfig.postgres?.envFile}"`;
        }
        commands.push(cmd);
        LoggerFactory.getInstance().debug(
            `addRules: command: ${commands[commands.length - 1]}`,
            { correlationId: this.getId() },
        );
        // Trigger
        const cmdShellExec = new ShellExecution(`${commands.join(' && ')}`);
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
        this.fileLocation = Uri.joinPath(
            Uri.parse(this.containerWorkingDir),
            (this.currentFile as TextDocument).uri.fsPath,
        );
    }
}
