export interface CredentialDiggerTaskDefinition {
    type: CredentialDiggerTaskDefinitionType;
    action: CredentialDiggerTaskDefinitionAction;
    group: CredentialDiggerTaskGroup;
    scanId: string;
}

export enum CredentialDiggerTaskDefinitionType {
    Shell = 'shell',
    Docker = 'docker',
}

export enum CredentialDiggerTaskDefinitionAction {
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
    CredentialDiggerTaskDefinitionAction,
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
