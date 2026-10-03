# Phantom Web architecture

A single Vite/React/TypeScript application with independent npm dependencies and a lockfile. Zod validates versioned corpus, session, and model-response formats. No application server, account system, credential, or provider request is included.

## Layers

- `src/canon.ts` is the immutable authoring boundary. It stores the Astra Relay facts, chronology, clues, deliberate red herring, character knowledge, disclosure gates, hint ladder, and two ending definitions. `validateCanon` checks references, cycles, sources, chronology, and ending reachability at module load.
- `src/corpus.json` is the page corpus. Every page has a fictional `astra.invalid` address, a visual style, public fact tags, authored links, prerequisite clues, and any observation clues awarded on first open. Search uses the actual title/body corpus.
- `src/engine.ts` is the authoritative reducer-like command surface. `openDocument`, `saveEvidence`, `annotateEvidence`, `connectEvidence`, `askCharacter`, `runTerminalCommand`, `requestHint`, `chooseEnding`, `writeSession`, and `readSession` are the only progression writers. Rewards use stable event IDs so reopening a page or retrying a command is safe.
- `src/App.tsx` is the fictional browser and notebook. It renders the engine state, labels prepared behavior, keeps navigation/history visible, and stores a validated `phantom-web/session/v1` save in local storage.
- `src/domain.ts` contains the reusable corpus/search and document-only notebook validators used by the lower-level fixtures.

## Character and model boundary

`ModelProposalSchema` accepts inert text, clue claims, and a small `grant-clue` action union. `applyModelProposal` authorizes every claim and action against the selected character's disclosure gates, known clue IDs, and current session. Invalid, forbidden, fabricated, duplicate, or direct-ending proposals return the original session byte-for-byte. The current UI uses authored prepared responses; no model request is made.

A future server adapter must keep credentials outside the browser bundle, bound request size and time, support cancellation, and return this schema. Timeouts, malformed responses, and reloads must leave the local session available for a safe retry. Generated prose can add flavor but cannot become canon automatically.

`src/live-adapter.ts` is the browser-side transport boundary. `buildLiveRequest` includes only the selected character's discovered clue text, recent authored page IDs, and that character's bounded dialogue memory. `requestLiveResponse` enforces an endpoint, JSON envelope, timeout, external cancellation, and response schema before returning a proposal to `applyModelProposal`. An unset endpoint returns `unavailable` and keeps the prepared route complete.

## Session boundary

Saves carry `storyId`, `canonVersion`, a schema version, visited pages, tabs/history, discovered clues, sourced evidence and annotations, character memory, hint count, deterministic events, and an optional ending. `readSession` rejects malformed, incompatible, unknown-reference, duplicate-event, and unsupported-ending data without partial import. The UI has explicit restart and author-reveal controls; restart clears only this fictional local session.

## Scope and limits

The first prepared mystery is complete enough to play locally and reach both endings through the clue gates. A local dev server is not a public deployment. Live provider behavior, interruption/retry against a real model, browser recording, audio, and production hosting remain separate proof tasks. See [NEXT-STEPS.md](NEXT-STEPS.md).
