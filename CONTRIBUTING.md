# Contributing to Semantic-CV core

Thanks for taking an interest. Bug reports, ideas and pull requests are all welcome.

## Before you start

- **Found a bug or have an idea?** Open an [issue](https://github.com/handiman/semantic-cv-core/issues).
- **Planning a larger change?** Open an issue first, so we can agree on the approach before you put time into it.
- **Found a security problem?** Don't open a public issue. Email [security@semantic.cv](mailto:security@semantic.cv) instead.

## What lives here

Core is shared by the [Semantic-CV CLI](https://github.com/handiman/semantic-cv) and [semantic.cv](https://semantic.cv), which include this repository as a Git submodule. A change here reaches both.

| Path                         | What it does                                                 |
| ---------------------------- | ------------------------------------------------------------ |
| `normalize.ts`, `normalize/` | Turns any schema.org/Person input into one predictable shape |
| `analyze.ts`, `analyze/`     | Validates a CV and reports errors and warnings               |
| `analyzeFiles.ts`            | Reads and reports on CV files, for the CLI                   |
| `render/html.ts`             | Builds the HTML page around a theme                          |
| `render/ats.ts`              | Builds the plain-text (ATS) CV                               |
| `render/escape.ts`           | HTML escaping and URL checks for CV data                     |

## Rules worth knowing

- **No I/O outside `analyzeFiles.ts`.** Everything else also runs in a Cloudflare Worker, so it must not import `node:fs`, `process` or other Node-only APIs.
- **CV data is untrusted.** `renderHTML` escapes the Person before a theme sees it, and serializes the JSON-LD so it can't close its `<script>`. Keep it that way when you change rendering.
- **Normalizing is idempotent.** Running `normalize` on its own output must give the same result.

## Getting set up

You need Node.js 20 or later (CI runs Node 25).

```sh
git clone https://github.com/handiman/semantic-cv-core.git
cd semantic-cv-core
npm ci
npm test
```

## Making a change

1. Branch from `master`, named after the kind of change: `fix/…`, `feat/…`, `docs/…`, `refactor/…`, `test/…`.
2. Add or update tests in `test/` for what you change.
3. Run `npm test`. CI runs it and it must pass before a merge.
4. Write commit messages as `type(Scope): Subject`, for example `fix(Render): Fix ATS section breaks`.
5. Open a pull request against `master`. Say what it changes and why, and link the issue it closes (`Closes #123`).

## Code of conduct

Everyone taking part is expected to follow the [code of conduct](CODE_OF_CONDUCT.md).
