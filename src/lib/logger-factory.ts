import { IVSCodeExtLogger, getExtensionLogger } from '@vscode-logging/logger';
import * as vscode from 'vscode';
import MetaReaderFactory from './meta-reader-factory';

export default class LoggerFactory {
    private static instance: LoggerFactory;
    private readonly logger: IVSCodeExtLogger;
    private extensionName: string;

    private constructor() {
        this.extensionName = MetaReaderFactory.getInstance().getExtensionName();
        // Create output channel
        const logOutputChannel = vscode.window.createOutputChannel(
            this.extensionName,
        );
        this.logger = getExtensionLogger({
            extName: this.extensionName,
            level: 'debug',
            logOutputChannel: logOutputChannel,
            sourceLocationTracking: false,
            logConsole: true,
        });
    }

    public static getInstance(): LoggerFactory {
        if (!LoggerFactory.instance) {
            LoggerFactory.instance = new LoggerFactory();
        }
        return LoggerFactory.instance;
    }

    public fatal(msg: string) {
        this.logger.fatal(msg);
    }

    public error(msg: string) {
        this.logger.error(msg);
    }

    public warn(msg: string) {
        this.logger.warn(msg);
    }

    public info(msg: string) {
        this.logger.info(msg);
    }

    public debug(msg: string) {
        this.logger.debug(msg);
    }

    public trace(msg: string) {
        this.logger.trace(msg);
    }
}
