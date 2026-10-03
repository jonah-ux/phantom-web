# Phantom Web

[Source repository](https://github.com/jonah-ux/phantom-web)

A fictional internet with a coherent, interactive mystery.

**Status: runnable development starter. Live AI integration and the complete product are still to be built.**

## What runs now

Three original sample documents, real corpus search, source-linked notebook persistence, and canon/reference validation tests.

The UI labels its prepared behavior explicitly. No model credentials are required.

## Start locally

Use Node.js 22.12 or newer and npm. From a clean clone:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5174. Each of the three creative projects uses a different development port.

## Checks

```sh
npm run verify
```

This runs lint, TypeScript, meaningful starter unit/engine checks, and the production build. CI runs the same command after a locked install. Browser/audio acceptance is additional product proof; a build alone is not that proof.

## Build the product

Start with [AGENTS.md](AGENTS.md), then give an agent the complete [build prompt](docs/BUILD-PROMPT.md). [NEXT-STEPS.md](docs/NEXT-STEPS.md) distinguishes this starter from the remaining first release.

Author the complete canon and clue graph, write the remaining pages, implement three character roles and disclosure gates, and prove two reachable endings before adding broad world generation.

## Architecture

`src/domain.ts` owns corpus/notebook validation and search; `src/corpus.json` owns the initial fictional documents; `src/App.tsx` provides archive navigation and local notebook controls.

Keep model output as validated data and provider secrets on a future server-side adapter. There is no server or provider connection in this starter; no environment credential is needed or read. See [architecture](docs/ARCHITECTURE.md).

## Provenance

The starter uses the official Vite React/TypeScript template and public dependencies recorded in the lockfile. Original sample data and prepared behavior were authored with AI assistance. This is not a claim to have completed the larger AI experience or invented its entire category. [MIT license](LICENSE).
