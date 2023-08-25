import { tmpdir } from 'os';
import { resolve } from 'path';

import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = resolve(__dirname, '../../');

        // Launch args
        const launchArgs = ['--disable-gpu', '--user-data-dir', `${tmpdir()}`];
        if (process.argv[2] !== 'unit') {
            launchArgs.push('--disable-extensions');
        }

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = resolve(__dirname, './index');
        // Download VS Code, unzip it and run the tests
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs,
            extensionTestsEnv: {
                scope: process.argv[2] ?? 'all',
            },
        });
    } catch (err) {
        console.error('Failed to run tests', err);
        process.exit(1);
    }
}

main();
