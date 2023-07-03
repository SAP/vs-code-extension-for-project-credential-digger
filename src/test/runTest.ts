import * as path from 'path';
import * as os from 'os';

import { runTests } from '@vscode/test-electron';

async function main() {
    let retVal = 0;
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        const launchArgs = [
            '--disable-extensions',
            '--disable-gpu',
            '--user-data-dir',
            `${os.tmpdir()}`,
        ];

        // vscode insiders must be launched with --no-sandbox when running as root
        // (this should only happen on the CI anyway)
        if (
            process.env.VSCODE_VERSION !== undefined &&
            process.env.VSCODE_VERSION === 'insiders' &&
            os.userInfo().uid === 0
        ) {
            launchArgs.push('--no-sandbox');
        }

        // Download VS Code, unzip it and run the integration test
        retVal = await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs,
        });
    } catch (err) {
        console.error('Failed to run tests', err);
        retVal = 1;
    }
    process.exit(retVal);
}

main();
