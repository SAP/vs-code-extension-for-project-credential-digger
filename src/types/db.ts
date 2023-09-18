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
    FalsePositive = 'false_positive',
}

export interface Rule {
    id: number;
    regex: string;
    category: string;
    description: string;
}

export interface RawDiscovery {
    id: string;
    file_name: string;
    commit_id: string;
    line_number: string;
    snippet: string;
    repo_url: string;
    rule_id: string;
    state: State;
    timestamp: string;
    rule_regex: string;
    rule_category: string;
    rule_description: string;
}
