import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

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
        ui: 'bdd',
        color: true,
        diff: true,
        fullTrace: true,
        reporter: process.env.NODE_ENV !== 'debug' ? 'mochawesome' : undefined,
        reporterOptions: {
            json: false,
        },
        require: ['mochawesome/register'],
    });

    const testsRoot = path.resolve(__dirname, '..');

    return new Promise((c, e) => {
        glob('**/**.test.js', { cwd: testsRoot }, async (err, files) => {
            if (err) {
                return e(err);
            }

            // Add files to the test suite
            files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

            try {
                // Run the mocha test
                mocha.run(async (failures) => {
                    if (failures > 0) {
                        e(new Error(`${failures} tests failed.`));
                    } else {
                        if (nyc) {
                            nyc.writeCoverageFile();
                            await nyc.report();
                        }
                        c();
                    }
                });
            } catch (err) {
                console.error(err);
                e(err);
            }
        });
    });
}
