# Build Phantom Web: a fictional internet with a living mystery

## Your mission

Build and publish an independently usable open-source project provisionally named **Phantom Web**, targeting `jonah-ux/phantom-web`. Deliver a compelling browser mystery told across an interconnected fictional internet: websites, forum posts, logs, correspondence, searchable archives, and AI-driven characters who have different knowledge and motives.

The desired reaction is: “I found one strange page, followed the clues, and forgot this was a software demo.” Own the first complete experience, its engine, its visible verification, and its public repository. A landing page, chat wrapper, pile of generated documents, or design plan is not completion.

## Context, ownership, and scope

- Jonah wants ambitious, fun public projects with a discernible original contribution. Use an ordinary computer and browser; require no new hardware or specialized headset.
- Inspect whether the target repository exists, who owns the work, and its applicable instructions. Preserve dirty/shared work and use a suitable isolated checkout. If the name belongs to an unrelated project, choose an available name without overwriting it.
- Identify this project by the full name and repository. A discovery match for an unrelated infrastructure project called “Phantom” is not ownership of this fictional-web product.
- If absent, create the standalone project and publish reviewed contents to a new public repository in Jonah's account through the available authorized GitHub route. Follow governed merge/release owners where required; never rewrite published history or bypass a gate.
- Keep the public project independent of private Fleet, Portal, Atlas, and Forgeyard runtime services. Existing development helpers are not required product dependencies.
- Make normal implementation decisions autonomously. Keep changes reviewable, Conventional Commits truthful, and any delegation bounded with explicit ownership. Resolve missing information only when it blocks a concrete next step; continue independent useful work.

## The first mystery

Create an original, self-contained story under a provisional setting such as **Astra Relay**: a fictional research station disappeared in 1997, and its old website has started updating. All institutions, people, locations, and messages are invented and presented as part of a fictional experience.

Design one satisfying solution before generating decorative material. The world must have:

- Approximately twelve connected pages, including a station home page, staff directory, maintenance log, forum thread, news archive, personal page, and simulated terminal or message console.
- Three interactive characters with distinct roles, knowledge, motives, and disclosure conditions. A reporter, engineer, and archivist are possible roles; develop them beyond those labels.
- A clue chain that can be solved through observation, comparison, and dialogue. Contradictions must be intentional and connected to the authored truth.
- Two meaningful endings selected by the player's final informed decision. The endings and their reachable conditions belong to the engine.
- A built-in hint ladder that helps without immediately revealing the solution, plus a deliberate restart/reveal path.

Write the canon, clue graph, and ending conditions first. Then make the pages feel like different people produced them at different times. Plant understandable breadcrumbs. The opening page should provide an immediate reason to investigate.

## The player experience

Use an app-contained fictional browser with tabs, history, address-like labels, and a search field over the story corpus. These controls must actually work. A visible fiction/session identity should make the premise clear without spoiling the atmosphere.

Let the player save discoveries, highlight suspicious passages, attach notes to evidence, and connect relevant clues. Show the source of each saved passage. The notebook should help reasoning without automatically exposing the hidden truth.

AI characters respond to what the player asks, what that character can know, what the player has uncovered, and the character's current motive. The player should be able to ask unanticipated questions and pursue different routes. Character memory must survive a saved-session reload in a documented way.

The fictional web can change after engine-recognized discoveries: an archived page appears, a character sends an in-game message, or a contradictory log becomes accessible. Such changes must be tied to actual state transitions. Keep all interactions inside the experience; no real email, phone calls, outside accounts, or external investigation is required.

Ship both a labeled no-key guided mode and a live-AI mode. The no-key mode should be enjoyable and solvable with prepared dialogue/options. It must clearly identify its prepared responses.

## Original contribution and aesthetic

Briefly investigate relevant alternate-reality games, interactive fiction engines, and generative-character projects. Record the closest relationships and licenses. Pursue this contribution: **a canon-backed miniature internet whose documents and characters can respond to a player's discoveries without losing the mystery's logic**.

Make the sites visually distinct: a dated technical page, a different forum, an archive, and a personal site should not all share the same card layout. Use typography, timestamps, broken-looking but intentional fictional artifacts, and restrained sound to establish atmosphere. Keep ordinary navigation reliable. All necessary clues must be available as accessible text; avoid color-only or audio-only puzzles.

Keep developer diagnostics and provider details in an optional inspector/settings area. The main experience is investigation.

## Engineering model

Prefer a small TypeScript browser application, a thin server-side model adapter, and local session persistence. React/Vite and IndexedDB are reasonable defaults. Verify current libraries and use a simpler proven choice if justified. Pin dependencies. Start with single-player; avoid account infrastructure and multiplayer until the first mystery is complete.

Separate the following:

- **Canon:** immutable versioned facts, entities, chronology, secrets, intentional false claims, character knowledge, and ending definitions.
- **Story engine:** authoritative clue acquisition, disclosure gates, event transitions, hint progression, ending reachability, and session validation.
- **Page corpus:** structured documents referencing canon and claim IDs, with original writing and licensed/original assets.
- **Character adapter:** receives only that character's permitted context and proposes a typed response with permitted fact references and supported in-game actions.
- **Fictional browser and notebook:** navigation, search, evidence selection, annotations, and explanation of visible state.
- **Session storage:** story/schema versions, event history, discovered clues, notes, character conversations, and save/load migration/refusal behavior.

The engine owns progression. A model cannot declare a clue discovered, invent an ending, alter history, or unlock information merely by saying it did. Validate returned references and in-game action proposals against character knowledge and current disclosure conditions. Send only necessary allowed facts to the character adapter rather than the entire hidden solution. Missing context should produce an in-character uncertainty response.

Separate generated flavor from facts that affect the puzzle. Render mechanically important facts from engine-validated data. Generated prose must not become new canon automatically. Do not claim complete hallucination elimination; prove that invalid responses cannot corrupt progression or the authored solution.

Model requests are bounded and cancellable. A timeout, cancellation, malformed response, or reload must not duplicate an event or consume a one-time clue incorrectly. Preserve the session and provide an understandable retry. Use documented server-side provider configuration; keys never enter the shipped browser bundle or exported session.

Render generated content as safe structured text/components, not executable HTML or scripts. Simulated terminal actions must operate only on story state. Story corpus search should search actual shipped content, not fabricate search results. Do not make a model scrape outside sites or contact real people.

Save files need explicit story and schema versions, size limits, validation, and consistent event restoration. Unknown or incompatible versions require a useful refusal or a tested migration. Do not silently reset progress. Bound conversation histories and provide clear local session deletion/reset controls.

## Build sequence

1. **Complete authored mystery.** Write canon, chronology, clue graph, pages, three character roles, hints, and two endings. Implement a playable no-key path and mechanically verify reachability.
2. **Fictional browser and evidence tools.** Deliver navigation, real corpus search, source-linked notebook, purposeful page styles, and save/load. Have the mystery played through from an empty session.
3. **Real character interaction.** Connect one provider adapter to permitted character context. Verify unexpected questions, knowledge boundaries, interruption/retry, and progression constraints. Preserve the enjoyable prepared mode.
4. **Release-quality experience.** Polish onboarding, accessibility, error recovery, documentation, a spoiler-conscious demo recording, clean-clone installation proof, and repository publication.

Defer arbitrary world generation, voice casting, multiplayer, real web integrations, endless pages, and a creator marketplace. A small coherent mystery must succeed first. Keep the canon format reusable so a later creator mode has a real foundation.

## Acceptance criteria

Produce actual evidence for these flows:

- Start from an empty session, follow a legitimate clue route, and reach each ending in separate runs. Tests must demonstrate all required facts and gates, not set an ending flag directly.
- Validate canon references, chronology, document claims, clue dependencies, and absence of accidental unreachable required clues. Intentional red herrings must not be mistaken for broken references.
- Verify two different supported investigation orders converge on consistent state. Reopening a page or retrying a request must not duplicate rewards or events.
- Search an authored term, open a result, save a sourced passage, annotate it, reload, and see the actual notebook restored.
- Save a mid-story session with character memory, reset, restore it, and continue without lost clues or premature secret disclosure. Reject malformed/incompatible saves without partial import.
- Model fixtures requesting forbidden secrets, fabricated clue IDs, duplicate actions, or invalid transitions must leave authoritative story state intact. Run at least one actual configured-provider conversation through a gated discovery before claiming live AI verified.
- A timeout and a cancellation preserve session state and permit a safe retry. Missing authorized credentials are a specific live-provider proof gap, not a reason to stop building the authored experience.
- Browser proof exercises tabs, navigation, corpus search, notebook, dialogue, hints, and an ending. Capture meaningful visible evidence without putting hidden solution text in the main README.
- Distinguish engine/fixture checks, actual model interaction, and a human or agent playthrough. Do not claim narrative quality, factual consistency, or solvability from a generic LLM judge alone.

## Repository and final handoff

Include a compatible open-source license, lockfile, secret-free environment example, useful CI, one shipped complete mystery, and concise AGENTS.md. Keep docs focused: README with the experience and run path, canon/story format and architecture, spoiler-separated author guide, attribution, and honest limits. Public source can reveal the authored solution; label spoiler material clearly rather than pretending this is an anti-cheat system.

Ensure a clean clone can run the full prepared experience without private services, unpublished files, paid accounts, or external assets that disappear. Document live-model setup and exactly what optional user text is sent to the selected provider. Use original fictional assets or properly attributed compatible material; check the publication surface for credentials, private paths, real conversations, and incidental personal data.

Commit and publish useful authored work through the repository's normal governed route. Do not manufacture history, badges, benchmark claims, or novelty claims. Disclose relevant AI assistance and upstream reuse.

Finish with the repository/PR link, reviewed commit, commands actually run and results including failures/skips, visible playthrough evidence, reached endings, live-provider status, supported browsers, limitations, and the shortest user run path. Distinguish a local playable build from a public deployment or release. Hosting/publication must use an authorized owner route. Deliver the complete first mystery before proposing a larger platform.
