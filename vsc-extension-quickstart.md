# Quick Start

## What's in the folder

-   This folder contains all of the files necessary for the extension.
-   `package.json` - this is the manifest file in which you declare the extension and the command.
    -   The sample plugin registers a command and defines its title and command name. With this information VS Code can show the command in the command palette. It doesn’t yet need to load the plugin.
-   `src/extension.ts` - this is the main file where you will provide the implementation of the command.
    -   The file exports one function, `activate`, which is called the very first time the extension is activated (in this case by executing the command). Inside the `activate` function we call `registerCommand`.
    -   We pass the function containing the implementation of the command as the second parameter to `registerCommand`.

## Get up and running straight away

-   Press `F5` to open a new window with the extension loaded.
-   Run a command from the command palette by pressing (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac) and typing `Credential Digger: Add Rules`.
-   Set breakpoints in your code inside `src/extension.ts` to debug the extension.
-   Find output from the extension in the debug console.

## Make changes

-   You can relaunch the extension from the debug toolbar after changing code in `src/extension.ts`.
-   You can also reload (`Ctrl+R` or `Cmd+R` on Mac) the VS Code window with the extension to load your changes.

## Explore the API

-   You can open the full set of our API when you open the file `node_modules/@types/vscode/index.d.ts`.

## Run tests

-   Open the debug viewlet (`Ctrl+Shift+D` or `Cmd+Shift+D` on Mac) and from the launch configuration dropdown pick `Extension All Tests`.
-   Press `F5` to run the tests in a new window with the extension loaded.
-   See the output of the test result in the debug console.
-   Make changes to `src/test/unit/extension.unit.test.ts` or create new test files inside the `test/unit` or `test/integration` folder.
    -   The provided test runner will only consider files matching the name pattern `**.test.ts`.

## Go further

-   [Follow UX guidelines](https://code.visualstudio.com/api/ux-guidelines/overview) to create extensions that seamlessly integrate with VS Code's native interface and patterns.
-   Reduce the extension size and improve the startup time by [bundling your extension](https://code.visualstudio.com/api/working-with-extensions/bundling-extension).
-   [Publish your extension](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) on the VS Code extension marketplace.
-   Automate builds by setting up [Continuous Integration](https://code.visualstudio.com/api/working-with-extensions/continuous-integration).
