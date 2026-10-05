# Phantom Web

[Source repository](https://github.com/jonah-ux/phantom-web)

A fictional internet with a coherent, interactive mystery.

**Status: runnable no-key mystery with a repeatable browser gate. Live AI integration remains optional, and the Pages workflow is ready for its first public deployment.**

## What runs now

The Astra Relay story is a complete no-key investigation with twelve authored pages, a versioned canon, a dependency-checked clue graph, three witnesses, a local terminal, a hint ladder, source-linked notebook annotations, save/load, and two engine-gated endings. The interface is an app-contained fictional browser: it never contacts the real internet while you investigate.

Prepared character responses are labeled `LOCAL / NO-KEY` and cannot mutate the story outside the engine's authorized clue actions. No model credentials are required. A future provider adapter must remain server-side and optional.

## Start locally

Use Node.js 22.12 or newer and npm. From a clean clone:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5174. Each of the three creative projects uses a different development port.

## Public Pages build

The repository includes a GitHub Pages workflow at [`.github/workflows/pages.yml`](.github/workflows/pages.yml). It builds with the `/phantom-web/` base path, checks the generated asset URLs, uploads the exact `dist/` artifact, and deploys it through the GitHub Pages environment. To reproduce the release artifact locally:

```sh
VITE_BASE_PATH=/phantom-web/ npm run build
npm run check:pages
```

The workflow prepares deployment; a public URL is only considered adopted after the workflow run and `https://jonah-ux.github.io/phantom-web/` both read back successfully.

## Checks

```sh
npm run verify
```

This runs lint, TypeScript, canon/engine checks, and the production build. CI runs the same command after a locked install. Browser acceptance is additional product proof; a build alone is not that proof.

## Play the first mystery

1. Open the welcome page and the staff directory.
2. Read the maintenance log and news clipping, then open the forum and message console.
3. Run `COMPARE CLOCKS`, ask the witnesses about the triangle and blue channel, and follow the unlocked correspondence.
4. Ask Noor for corroboration or Mara for the privacy request, run `AUDIT PACKET`, and choose an ending.
5. Save a passage, add a note, reload the page, and use the notebook to return to its source.

The public source contains spoiler material in [AUTHOR-GUIDE.md](docs/AUTHOR-GUIDE.md). The main README intentionally describes the route without printing the solution.

## Architecture and boundaries

`src/canon.ts` owns the immutable Astra Relay facts, chronology, clue graph, character knowledge, disclosure gates, hints, and ending requirements. `src/corpus.json` owns the authored fictional pages and their document-level gates. `src/engine.ts` is the only writer for session progression, evidence, dialogue memory, terminal effects, hints, saves, and endings. `src/App.tsx` renders the fictional browser and prepared experience.

The engine validates every document, clue, source, prerequisite, model proposal, and imported session. A character can suggest text and a permitted clue, but cannot unlock a page, set an ending, invent a clue, or rewrite the canon. Model output is currently fixture-only; there is no provider call in this repository.

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data boundaries and [NEXT-STEPS.md](docs/NEXT-STEPS.md) for the remaining release work.

## Provenance and limits

The setting, pages, characters, and clue graph are original fictional content authored for this repository with AI assistance. The starter used the official Vite React/TypeScript template and public dependencies recorded in the lockfile. No external images, real institutions, real people, or private services are required. This project does not claim narrative quality from automated tests, live model behavior, or a deployment that has not been performed.

[MIT license](LICENSE).
