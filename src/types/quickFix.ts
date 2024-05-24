export type Documentation = {
    title: string;
    content: string;
};

export enum ProjectType {
    Opt1 = 'opt_1',
    Opt2 = 'opt_2',
}

export interface Option {
    dep: string;
    imp: string;
    init: string;
    use: string;
    tag: string;
}

export interface LanguageOptions {
    [option: string]: Option;
}

export interface Languages {
    '.js'?: LanguageOptions;
    '.java'?: LanguageOptions;
    '.py'?: LanguageOptions;
    '.cs'?: LanguageOptions;
    '.php'?: LanguageOptions;
}

export interface AiPromptsAndDocs {
    other_prompt: string;
    btp_prompt: string;
    btp_documentation: string;
    begin_html: string;
    end_html: string;
    promt_env_var: string;
}
