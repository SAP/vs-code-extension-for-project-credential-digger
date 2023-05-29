export interface CredentialDiggerTaskDefinition {
    type: CredentialDiggerTaskDefinitionType;
    group: CredentialDiggerTaskGroup;
    scanId: string;
}

export enum CredentialDiggerTaskDefinitionType {
    Scan = 'scan',
    Discoveries = 'discoveries',
    Cleanup = 'cleanup',
    AddRules = 'addRules',
}

export enum CredentialDiggerTaskGroup {
    CredentialDigger = 'CredentialDigger',
}

export interface CredentialDiggerTaskInfo {
    name: string;
    description: string;
}

export const CredentialDiggerTasks: Record<
    CredentialDiggerTaskDefinitionType,
    CredentialDiggerTaskInfo
> = {
    scan: {
        name: 'CredentialDiggerScan',
        description: 'Credential Digger Scan',
    },
    discoveries: {
        name: 'CredentialDiggerDiscoveries',
        description: 'Credential Digger Discoveries',
    },
    cleanup: {
        name: 'CredentialDiggerCleanup',
        description: 'Credential Digger Cleanup',
    },
    addRules: {
        name: 'CredentialDiggerAddRules',
        description: 'Credential Digger Add Rules',
    },
};

export enum TaskProblemMatcher {
    Shell = '$shell',
    Docker = '$docker',
}
