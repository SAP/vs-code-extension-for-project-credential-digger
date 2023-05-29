export interface Discovery {
    id: number;
    filename: string;
    commitId: string;
    lineNumber: number;
    snippet: string;
    repoUrl: string;
    ruleId: number;
    state: State;
    timestamp: string;
    rule?: Rule;
}

export enum State {
    New = 'new',
}

export interface Rule {
    id: number;
    regex: string;
    category: string;
    description: string;
}
