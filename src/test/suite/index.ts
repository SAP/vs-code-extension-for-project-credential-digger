import * as path from 'path';
import * as Mocha from 'mocha';
import { glob } from 'glob';

function setupCoverage() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NYC = require('nyc');
    const nyc = new NYC({
        extends: '@istanbuljs/nyc-config-typescript',
        all: true,
        cwd: path.join(__dirname, '..', '..', '..'),
        exclude: ['**/test/**', '.vscode-test/**', '**/types/**'],
        hookRequire: true,
        hookRunInContext: true,
        hookRunInThisContext: true,
        instrument: true,
        reporter: ['text', 'html'],
    });
    nyc.reset();
    nyc.wrap();
    return nyc;
}

export async function run(): Promise<void> {
    const nyc = setupCoverage();

    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
    });

    const testsRoot = path.resolve(__dirname, '..');
    try {
        const files = await glob('**/**.test.js', { cwd: testsRoot });
        files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));
        // Run the mocha test
        mocha.run((failures) => {
            if (failures > 0) {
                throw new Error(`${failures} tests failed.`);
            } else {
                return;
            }
        });
    } catch (err) {
        console.error(err);
        throw err;
    } finally {
        if (nyc) {
            nyc.writeCoverageFile();
            await nyc.report();
        }
    }
}
