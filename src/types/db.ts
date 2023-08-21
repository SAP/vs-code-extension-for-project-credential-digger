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

export interface RawDiscovery {
    id: number;
    file_name: string;
    commit_id: string;
    line_number: number;
    snippet: string;
    repo_url: string;
    rule_id: number;
    state: State;
    timestamp: string;
    rule_regex: string;
    rule_category: string;
    rule_description: string;
}
