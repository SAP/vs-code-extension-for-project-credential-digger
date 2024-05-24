import { promises as fs } from 'fs';
import { Uri } from 'vscode';

import axios, { AxiosResponse } from 'axios';

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
    prompt: string;
    max_tokens: number;
    temperature: number;
    n: number;
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
        console.error('Error generating chat response:', error);
        return 'Error generating chat response: ' + error;
    }
}

export async function call_openAI_btp(message: string, keyPath: string) {
    try {
        const data: Data = {
            deployment_id: 'text-davinci-003',
            prompt: message,
            max_tokens: 1000,
            temperature: 0.0,
            n: 1,
        };
        const response = (await makeRequest(
            data,
            keyPath,
        )) as unknown as AxiosResponse;
        return { success: true, message: response.data.choices[0].text };
    } catch (error) {
        console.error('Error generating chat response: ', error);
        return {
            success: false,
            message: 'Error generating chat response: ' + error,
        };
    }
}
