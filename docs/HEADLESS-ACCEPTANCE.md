# Headless browser acceptance

Phantom Web's browser gate uses a real headless Chromium session through the Playwright CLI. The flow is separate from `npm run verify` because a compile, unit test, or build cannot prove that a player can navigate the fictional browser, persist an investigation, or reach an engine-gated ending through rendered controls.

The repository's repeatable gate starts a disposable Vite server, a deterministic local live-adapter fixture, and headless Chromium in one command:

```sh
npm ci
npx --yes --package @playwright/cli@0.1.22 playwright-cli install-browser chromium
npm run test:browser
```

The same command runs in the `browser` job in GitHub Actions. It is the preferred release check because it covers the configured adapter path without requiring provider credentials. The fixture accepts one normal response, returns a deliberately malformed response for `MALFORMED`, and returns a schema-valid but engine-forbidden action for `FORBIDDEN`.

For a no-key-only local session, run the lower-level CLI flow:

```sh
npm ci
npm run dev -- --port 5183
PLAYWRIGHT_CLI_SESSION=phantom-web-acceptance npx --yes --package @playwright/cli@0.1.22 playwright-cli open http://127.0.0.1:5183/
PLAYWRIGHT_CLI_SESSION=phantom-web-acceptance npx --yes --package @playwright/cli@0.1.22 playwright-cli run-code --filename scripts/headless-acceptance.js
```

The script uses role, label, and visible-text locators for product actions. It waits for the selected archive tab and exact document title after every navigation, so a pre-existing heading cannot satisfy a navigation check. It only uses page evaluation to clear the disposable local session at the start of each run and to read independent postconditions. It covers:

- fresh startup, prepared no-key mode, skip link, search announcements, hint rendering, locked-page keyboard activation, and the unavailable live-adapter fallback;
- the configured live-adapter path, including a valid transcript, a malformed response that leaves the transcript unchanged, and an engine-forbidden action that leaves clue state unchanged;
- the authored route through comparison, Mara, Ilya, the sealed packet, Noor, and the final terminal audit;
- source save, notebook annotation, clue connection, reload persistence, same-ID import replacement (`NOTE A` → `NOTE B`), valid save restore, malformed-save refusal, and safe restart;
- both “Wake the relay” and “Keep the harbor quiet” endings;
- 320px horizontal overflow, ARIA reference targets, reduced-motion transition output, failed network requests, browser console errors, and page errors.

The acceptance run is evidence for the prepared and fixture-configured Chromium experience at the exact source head where it was run. It does not establish VoiceOver or NVDA announcements, Safari or Firefox behavior, a real provider's behavior, production hosting, or a public release.

The notebook interaction is intentionally tested as a rapid user sequence: type a note, leave the field, immediately connect a clue, reload, and read the textarea value back. This catches stale React-session transitions that a reducer-only test cannot see.
