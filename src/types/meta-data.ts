export interface MetaData {
    name: string;
    displayName: string;
    description: string;
    private: boolean;
    icon: string;
    keywords: string[];
    repository: Record<string, string>;
    publisher: string;
    license: string;
    engines: Record<string, string>;
    categories: string[];
    activationEvents: string[];
    main: string;
    contributes: Contributes;
    scripts: Record<string, string>;
    devDependencies: Record<string, string>;
    dependencies: Record<string, string>;
}

interface Command {
    command: string;
    title: string;
}

interface Configuration {
    id: string;
    title: string;
    required: string[];
    properties: Record<string, unknown>;
}

interface Contributes {
    commands: Command[];
    configuration: Configuration;
}
