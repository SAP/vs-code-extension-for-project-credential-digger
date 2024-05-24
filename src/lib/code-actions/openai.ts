import { promises as fs } from 'fs';
import { Uri } from 'vscode';

import axios, { AxiosResponse } from 'axios';

interface ChatResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

export async function call_openAI_gpt3(
    prompt: string,
    keyPath: string,
): Promise<{ success: boolean; message: string }> {
    try {
        const apiKey = await fs.readFile(Uri.file(keyPath).fsPath, 'utf8');

        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        };

        const data = {
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: prompt },
            ],
        };

        const response: AxiosResponse<ChatResponse> = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            data,
            { headers },
        );
        const responseData: ChatResponse = response.data;
        return {
            success: true,
            message: responseData.choices[0].message.content,
        };
    } catch (error) {
        console.error('Error generating chat response:', error);
        return {
            success: false,
            message:
                'Error generating chat response (should check the key): ' +
                error,
        };
    }
}
