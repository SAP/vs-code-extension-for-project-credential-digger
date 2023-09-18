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

    public fatal(msg: string, args?: object): void {
        this.logger.fatal(msg, args);
    }

    public error(msg: string, args?: object): void {
        this.logger.error(msg, args);
    }

    public warn(msg: string, args?: object): void {
        this.logger.warn(msg, args);
    }

    public info(msg: string, args?: object): void {
        this.logger.info(msg, args);
    }

    public debug(msg: string, args?: object): void {
        this.logger.debug(msg, args);
    }

    public trace(msg: string, args?: object): void {
        this.logger.trace(msg, args);
    }
}
