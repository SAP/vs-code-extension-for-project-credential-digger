import { readFileSync } from 'fs';
import { resolve } from 'path';

import { MetaData } from '../types/meta-data';

export default class MetaReaderFactory {
    private static instance: MetaReaderFactory;
    private readonly data: MetaData;
    private constructor() {
        this.data = JSON.parse(
            readFileSync(resolve(__dirname, '../..', 'package.json'), 'utf8'),
        );
    }

    public static getInstance(): MetaReaderFactory {
        if (!MetaReaderFactory.instance) {
            MetaReaderFactory.instance = new MetaReaderFactory();
        }
        return MetaReaderFactory.instance;
    }

    public getExtensionName(): string {
        return this.data.name;
    }

    public getExtensionDisplayName(): string {
        return this.data.displayName;
    }

    public getExtensionScanCommand(): string {
        return this.data.contributes?.commands
            ? this.data.contributes?.commands[0].command
            : '';
    }

    public getExtensionAddRulesCommand(): string {
        return this.data.contributes?.commands
            ? this.data.contributes?.commands[1].command
            : '';
    }
}
