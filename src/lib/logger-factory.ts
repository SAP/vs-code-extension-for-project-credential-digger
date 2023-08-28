import { window } from 'vscode';

import { IVSCodeExtLogger, getExtensionLogger } from '@vscode-logging/logger';

import MetaReaderFactory from './meta-reader-factory';

export default class LoggerFactory {
    private static instance: LoggerFactory;
    private readonly logger: IVSCodeExtLogger;

    private constructor() {
        MetaReaderFactory.getInstance().getExtensionDisplayName();
        // Create output channel
        const logOutputChannel = window.createOutputChannel(
            MetaReaderFactory.getInstance().getExtensionDisplayName(),
        );
        this.logger = getExtensionLogger({
            extName: MetaReaderFactory.getInstance().getExtensionName(),
            level: 'debug',
            logOutputChannel,
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

    public fatal(msg: string): void {
        this.logger.fatal(msg);
    }

    public error(msg: string): void {
        this.logger.error(msg);
    }

    public warn(msg: string): void {
        this.logger.warn(msg);
    }

    public info(msg: string): void {
        this.logger.info(msg);
    }

    public debug(msg: string): void {
        this.logger.debug(msg);
    }

    public trace(msg: string): void {
        this.logger.trace(msg);
    }
}
