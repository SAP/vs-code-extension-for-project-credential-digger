# Contributing

## Code of Conduct

All members of the project community must abide by the [Contributor Covenant, version 2.1](CODE_OF_CONDUCT.md).
Only by respecting each other we can develop a productive, collaborative community.
Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting [a project maintainer](.reuse/dep5).

## Engaging in Our Project

We use GitHub to manage reviews of pull requests.

-   If you are a new contributor, see: [Steps to Contribute](#steps-to-contribute)

-   Before implementing your change, create an issue that describes the problem you would like to solve or the code that should be enhanced. Please note that you are willing to work on that issue.

-   The team will review the issue and decide whether it should be implemented as a pull request. In that case, they will assign the issue to you. If the team decides against picking up the issue, the team will post a comment with an explanation.

## Steps to Contribute

Should you wish to work on an issue, please claim it first by commenting on the GitHub issue that you want to work on. This is to prevent duplicated efforts from other contributors on the same issue.

If you have questions about one of the issues, please comment on them, and one of the maintainers will clarify.

## Contributing Code or Documentation

You are welcome to contribute code in order to fix a bug or to implement a new feature that is logged as an issue.

The following rule governs code contributions:

-   Contributions must be licensed under the [Apache 2.0 License](./LICENSE)
-   Due to legal reasons, contributors will be asked to accept a Developer Certificate of Origin (DCO) when they create the first pull request to this project. This happens in an automated fashion during the submission process. SAP uses [the standard DCO text of the Linux Foundation](https://developercertificate.org/).

### Contribution process

-   Check the `main` branch and make sure that the issue/feature you want to work on has not been solved yet.
-   Fork the current repository to your GitHub account.
-   You must follow the coding style as best you can when submitting code. Take note of naming conventions, separation of concerns, and formatting rules.
    -   If you are using `vscode`, please install the recommended extensions
    -   To commit your changes run `npm run commit`, this will guide you to create a compliant commit message based on [conventional-commits](https://www.conventionalcommits.org/en/v1.0.0/)
    -   A pre-commit hook will run `prettier` for code formatting, `eslint` for static code scan, and will lint your commit message
-   Create a Pull Request from your forked repository to `github.com/SAP/vs-code-extension-for-project-credential-digger`. In the subject of the pull request, briefly describe the bug fix or enhancement you're contributing. In the pull request description, please provide a link to the issue in the issue tracker.
-   Follow the link posted by the CLA assistant to your pull request and accept the DCO.
-   Wait for our code review and approval. We may ask you for additional commits, or make changes to your pull request ourselves. Please be patient!
-   Once the change has been approved, we inform you in a comment.
-   We close the pull request. You can then delete the now obsolete branch.

Please have a look at [VS Code Extension Quick Start guide](./vsc-extension-quickstart.md) to get familiar with VS Code extension development.

#### Linting

```sh
npm run lint
# To run auto fix
npm run lint:fix
```

#### Formatting

```sh
npm run format
# To run auto fix
npm run format:fix
```

#### Compiling

```sh
npm run compile
```

#### Testing

```sh
npm run test
```

#### Commit

```sh
npm run commit
```

## Issues and Planning

-   We use GitHub issues to track bugs and enhancement requests.

-   Please provide as much context as possible when you open an issue. Before doing so, please make sure that:
    -   The issue is not a duplicate.
    -   The issue has not been fixed in a newer release of the extension.
    -   The issue is reproducible.
    -   Your explanation is comprehensive enough to reproduce that issue for the assignee.
    -   You provide example code and/or screenshots (recommended).

If you meet the above criteria, you can submit issues with our [GitHub issue tracker](https://github.com/SAP/vs-code-extension-for-project-credential-digger/issues). Please categorize your issue.
