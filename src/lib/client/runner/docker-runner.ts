import * as path from 'path';
import { Discovery } from '../../../types/db';
import Runner from './runner';
import * as fs from 'fs';
import LoggerFactory from '../../logger-factory';
import Utils from '../../utils';
import * as vscode from 'vscode';
import {
    CredentialDiggerRunnerDockerConfig,
    DbType,
} from '../../../types/config';
import {
    CredentialDiggerTaskDefinitionType,
    CredentialDiggerTaskGroup,
    CredentialDiggerTasks,
    TaskProblemMatcher,
} from '../../../types/task';

export default class DockerRunner extends Runner {
    private containerWorkingDir = '/data/credentialDigger';
    private discoveriesLocalFileLocation!: vscode.Uri;

    public async run(): Promise<number> {
        const commands = [];
        this.config = this.config as CredentialDiggerRunnerDockerConfig;

        // Copy to a temporary folder within the container
        this.fileLocation = vscode.Uri.joinPath(
            vscode.Uri.parse(this.containerWorkingDir),
            (this.currentFile as vscode.TextDocument).uri.fsPath,
        );
        commands.push(
            `docker exec "${this.config.containerId}" mkdir -p "${path.dirname(
                this.fileLocation.fsPath,
            )}"`,
        );
        commands.push(
            `docker cp "${
                (this.currentFile as vscode.TextDocument).uri.fsPath
            }" "${this.config.containerId}:${this.fileLocation.fsPath}"`,
        );

        // Scan
        let scanCmd = `docker exec "${this.config.containerId}" credentialdigger scan_path "${this.fileLocation.fsPath}" --models PathModel --force --debug`;
        if (this.config.databaseConfig.type === DbType.SQLite) {
            scanCmd += ` --sqlite "${this.config.databaseConfig.sqlite?.filename}"`;
        }
        commands.push(scanCmd);
        LoggerFactory.getInstance().debug(
            `${this.getId()}: scan: command: ${commands[commands.length - 1]}`,
        );

        // Trigger
        const cmdShellExec = new vscode.ShellExecution(
            `${commands.join(' && ')}`,
        );
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
            TaskProblemMatcher.Docker,
        );

        let exitCode = await Utils.executeTask(triggerTask);
        LoggerFactory.getInstance().debug(
            `${this.getId()}: scan: exit code: ${exitCode}`,
        );
        // For tasks exit code 127 is reserved for command not found
        if (exitCode === 127) {
            exitCode = -127;
        }
        return exitCode ?? 0;
    }

    public async getDiscoveries(storagePath: vscode.Uri): Promise<Discovery[]> {
        let discoveries: Discovery[] = [];
        const commands = [];
        this.config = this.config as CredentialDiggerRunnerDockerConfig;

        // Get discoveries
        if (!this.fileLocation) {
            return discoveries;
        }
        const filename =
            (await Utils.createHash(this.fileLocation.fsPath, 8)) + '.csv';
        this.discoveriesLocalFileLocation = vscode.Uri.joinPath(
            storagePath,
            filename,
        );
        this.discoveriesFileLocation = vscode.Uri.joinPath(
            vscode.Uri.parse(this.containerWorkingDir),
            filename,
        );

        let cmd = `docker exec "${this.config.containerId}" credentialdigger get_discoveries --with_rules --save "${this.discoveriesFileLocation.fsPath}" "${this.fileLocation.fsPath}"`;
        if (this.config.databaseConfig.type === DbType.SQLite) {
            cmd += ` --sqlite "${this.config.databaseConfig.sqlite?.filename}"`;
        }
        commands.push(cmd);
        LoggerFactory.getInstance().debug(
            `${this.getId()}: getDiscoveries: command: ${
                commands[commands.length - 1]
            }`,
        );

        // Copy discoveries file to extension workspace
        commands.push(
            `docker cp "${this.config.containerId}:${this.discoveriesFileLocation.fsPath}" "${this.discoveriesLocalFileLocation.fsPath}"`,
        );

        // Trigger
        const cmdShellExec = new vscode.ShellExecution(
            `${commands.join('; ')}`,
        );
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
            TaskProblemMatcher.Docker,
        );

        const exitCode = await Utils.executeTask(triggerTask);
        LoggerFactory.getInstance().debug(
            `${this.getId()}: getDiscoveries: exit code: ${exitCode}`,
        );
        if (exitCode === 0) {
            // Parse result file
            discoveries = await Utils.parseDiscoveriesCSVFile(
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
            const triggerTask = new vscode.Task(
                {
                    type: CredentialDiggerTaskDefinitionType.Cleanup,
                    group: CredentialDiggerTaskGroup,
                    scanId: this.getId(),
                },
                vscode.TaskScope.Workspace,
                CredentialDiggerTasks.cleanup.name,
                CredentialDiggerTasks.cleanup.description,
                new vscode.ShellExecution(`${commands.join('; ')}`),
                TaskProblemMatcher.Docker,
            );
            const exitCode = await Utils.executeTask(triggerTask);
            LoggerFactory.getInstance().debug(
                `${this.getId()}: cleanup: exit code: ${exitCode}`,
            );
        }

        // Cleanup the discoveries file
        if (this.discoveriesLocalFileLocation) {
            await fs.promises.rm(this.discoveriesLocalFileLocation.fsPath);
        }
    }

    protected validateConfig() {
        this.config = this.config as CredentialDiggerRunnerDockerConfig;
        if (!this.config.containerId) {
            throw new Error('Please provide a containerId');
        }
        super.validateConfig();
    }

    public async addRules(): Promise<boolean> {
        if (!this.rules) {
            return true;
        }
        const commands = [];
        this.config = this.config as CredentialDiggerRunnerDockerConfig;
        const rulesFileLocation = vscode.Uri.joinPath(
            vscode.Uri.parse(this.containerWorkingDir),
            this.rules.fsPath,
        );
        // Copy to container
        let cmd = `docker exec "${
            this.config.containerId
        }" mkdir -p "${path.dirname(rulesFileLocation.fsPath)}"`;
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
            `${this.getId()}: addRules: command: ${
                commands[commands.length - 1]
            }`,
        );
        // Trigger
        const cmdShellExec = new vscode.ShellExecution(
            `${commands.join(' && ')}`,
        );
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
            TaskProblemMatcher.Docker,
        );
        const exitCode = await Utils.executeTask(triggerTask);
        LoggerFactory.getInstance().debug(
            `${this.getId()}: addRules: exit code: ${exitCode}`,
        );
        return exitCode === 0;
    }
}
