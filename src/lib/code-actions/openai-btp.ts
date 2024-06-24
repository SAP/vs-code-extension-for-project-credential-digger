import { promises as fs } from 'fs';
import { Uri } from 'vscode';

import axios, { AxiosResponse } from 'axios';

import LoggerFactory from '../logger-factory';

interface SvcKey {
    url: string;
    uaa: {
        clientid: string;
        clientsecret: string;
        url: string;
    };
}

interface Data {
    deployment_id: string;
    messages: { role: string; content: string }[];
    max_tokens: number;
    temperature: number;
    frequency_penalty: number;
    presence_penalty: number;
}

async function loadUserKey(keyPath: string): Promise<SvcKey> {
    const rawData = await fs.readFile(Uri.file(keyPath).fsPath, 'utf8');
    const svcKey: SvcKey = JSON.parse(rawData);
    return svcKey;
}

// Get Token
async function getToken(svcKey: SvcKey): Promise<string> {
    const { clientid, clientsecret, url } = svcKey['uaa'];

    const response = (await axios.post(`${url}/oauth/token`, null, {
        auth: {
            username: clientid,
            password: clientsecret,
        },
        params: { grant_type: 'client_credentials' },
    })) as unknown as AxiosResponse;

    return response.data['access_token'];
}

async function makeRequest(
    data: Data,
    keyPath: string,
): Promise<AxiosResponse<unknown> | string> {
    try {
        const mySvcKey: SvcKey = await loadUserKey(keyPath);
        const myToken: string = await getToken(mySvcKey);

        const headers = {
            Authorization: `Bearer ${myToken}`,
            'Content-Type': 'application/json',
        };

        const response = (await axios.post(
            `${mySvcKey['url']}/api/v1/completions`,
            data,
            { headers: headers },
        )) as unknown as AxiosResponse;

        return response;
    } catch (error) {
        LoggerFactory.getInstance().error('Error generating chat response:', {
            error: error,
        });
        return 'Error generating chat response: ' + error;
    }
}

export async function call_openAI_btp(message: string, keyPath: string) {
    try {
        const data: Data = {
            deployment_id: 'gpt-4',
            messages: [{ role: 'user', content: message }],
            max_tokens: 800,
            temperature: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        };

        const response = (await makeRequest(
            data,
            keyPath,
        )) as unknown as AxiosResponse;

        if (response.data === undefined) {
            throw new Error(response.toString());
        }

        return {
            success: true,
            message: response.data.choices[0].message.content,
        };
    } catch (error) {
        LoggerFactory.getInstance().error('Error generating chat response:', {
            error: error,
        });
        return {
            success: false,
            message: error,
        };
    }
}
