# CLAUDE.md

Guidance for Claude Code in this repository.

## What this is

`semantic-cv-core` — the shared logic that normalizes, analyzes and renders a CV written as a
[schema.org/Person](https://schema.org/Person) JSON-LD document. It is used by the
[semantic-cv](https://github.com/handiman/semantic-cv) CLI (which includes this repo as the Git submodule `src/core`)
and by the hosted renderer at [semantic.cv](https://semantic.cv), which runs it on Cloudflare Workers.
It has no CLI commands and no themes — those live in the CLI repo and in `semantic-cv-themes`.

## Priorities (in order)

1. **Safe output.** A `cv.json` is untrusted input and the rendered page is served from a shared origin. Every string
   that reaches HTML is escaped (see "Escaping").
2. **Deterministic output.** Same input, byte-identical output. No timestamps or randomness; key order comes from
   [sort.ts](sort.ts).
3. **Runs everywhere.** The renderers and the analyzer must work in both Node and Workers.
4. **Minimal dependencies.** There are no runtime dependencies. Keep it that way.

## Conventions

- Every function is pure unless it is a documented terminal step (`renderATS` writes to a stream, `analyzeFiles.ts`
  reads files).
- **No `node:` imports** outside [analyzeFiles.ts](analyzeFiles.ts). It exists so the pure validator in `analyze.ts`
  can be bundled for Workers; don't pull `node:fs` back into `analyze.ts` or anything the renderers import.
- Normalization is idempotent and never mutates its input. Analysis never mutates either.
- Per-property logic lives in `normalize/<property>.ts` and `analyze/<property>.ts`, named after the schema.org
  property, and is composed in `normalize.ts` / `analyze.ts` with `pipe`. A new property needs both, plus a test.
- Known keys are matched case-insensitively by `fixCasing` in [normalize.ts](normalize.ts); a new property must be
  added to its `validKeys` and to the priority lists in [sort.ts](sort.ts).
- Everything is optional except `@context`, `@type`, `name`, `description` and `jobTitle`.
- **The CV's language** is the JSON-LD way: `{ "@language": "sv" }` in `@context`, not a property on the Person.
  [language.ts](language.ts) reads it (`languageOf`), only as a well-formed language tag. `normalize` keeps it at the
  end of the `@context` it sets, the analyzer accepts it after a known context, and `renderHTML` keeps it in the
  published JSON-LD and sets `<html lang>`.
- **Custom headings and labels** go in the theme object: `"theme": { "name": "lena", "headings": { … }, "labels":
  { … } }`. [themeOptions.ts](themeOptions.ts) lists the keys (keep them in step with `ThemeOptions` in
  semantic-cv-themes); `themeOptionsOf(person)` returns them **HTML-escaped**, since themes insert headings as HTML.
  Call it on the normalized Person, not on the copy `renderHTML` escapes, or they are escaped twice. The analyzer warns
  about unknown keys and values that aren't text.
- Import paths end in `.js` (ESM, `module: node20`). Tests import the compiled output through `#core/*`.
- Prettier is authoritative: double quotes, no trailing commas, width 100.

## Stack

- TypeScript, strict, compiled with `tsc` to `dist/` (the whole repo is `include`d, tests excluded by being `.js`).
- Tests are plain JavaScript on `node:test` and run against `dist/` — build first.
- No runtime dependencies; no test framework beyond `node:test`.

## Escaping

[render/escape.ts](render/escape.ts) is the security boundary; read it before touching `render/html.ts`.

- `renderHTML` runs `escapeForHtml(person)` once, and hands that copy to the theme. Themes insert values as HTML and
  must **not** escape again — double escaping shows up as `&amp;` in the page.
- `escapeForHtml` also drops values of URL keys (`url`, `sameAs`, `image`, …) unless they are relative or
  `http(s)`/`mailto`/`tel` (`safeUrl`). Add a new URL-carrying property to `URL_KEYS` there.
- Data embedded in `<script>` goes through `jsonForScript`; text placed in an HTML comment through `commentSafe`.
- Anything new that writes user data into HTML (meta tags, titles, attributes) uses `escapeHtml`. Don't build markup by
  string concatenation with raw CV values.
- The ATS renderer emits plain text and needs none of this.

## Rendering

- `renderHTML({ person, theme, transformer })` in [render/html.ts](render/html.ts) takes the theme's HTML, CSS and JS
  fragments and injects them into a fixed skeleton through an `HTMLTransformer` ([transform.ts](transform.ts)). The
  interface is implemented by `html-rewriter-wasm` in the CLI and by `HTMLRewriter` on Workers, so keep calls to
  `transform` / `on` to what both support.
- `renderATS(person, writable, closeStream)` in [render/ats.ts](render/ats.ts) streams a plain-text résumé, one field
  per line in a fixed order. `closeStream` is true in Node and false in Workers, where the caller closes it.

## Commands

- `npm ci` – install
- `npm run build` – clean and compile with `tsc`
- `npm test` – build, run all `*.test.js` and write a JUnit report to `test-results.xml`

Run `npm test` before considering work done. CI (`.github/workflows/ci.yml`) runs the same on every push.

## Tests

- `test/*.test.js` are the entry points; `test/analyze/` and `test/normalize/` hold one helper module per rule, called
  from `analyze.test.js` / `normalize.test.js`. A new rule gets a helper there and a call in the entry point.
- `escape.test.js` and `ats.test.js` cover the renderers. A change to escaping needs a test with a hostile value
  (`<script>`, `javascript:`, a quote that closes an attribute).
- `test/index.js` locates the package root; the tests use `#core/*` instead of relative paths into `dist/`.
- Tests are the spec. Write them as readable sentences (`it("keep the order the author gave them")`) so that a doc
  comment restating what a function does is redundant, and leave such comments out.

## Working in the CLI repo's submodule

This repository is included in `semantic-cv` as `src/core`. A change here is a PR in **this** repo; the CLI repo then
bumps its submodule pointer in a separate commit. Don't edit the files from inside the CLI repo's working tree without
a branch of your own here.

## Git workflow

Branch from `master` as `fix/…`, `feat/…`, `docs/…`, `refactor/…`, `test/…` or `ci/…`; commits are
`type(Scope): Subject`, for example `fix(Security): Resolve code scanning alerts`. Permissions for you:

- **Pushing a branch and opening a PR needs no confirmation.** (If `gh` can't open the PR:
  `POST /repos/<owner>/<repo>/pulls` via the REST API, owner/repo from `git remote get-url origin`, with the token
  `git credential fill` returns for github.com, and the JSON payload in a file — an emoji or backtick in the body
  breaks shell quoting.)
- **Merging into `master` needs asking, every time.** So does anything that ships to users. The CLI repo publishes to
  npm from its own `master`, so a merge here only reaches users once the CLI repo bumps the pointer.
- **Never rebase or force-push an already-pushed branch.** Ask first if rebasing still seems right for some reason.
