# Headless browser acceptance

Phantom Web's browser gate uses a real headless Chromium session through the Playwright CLI. The flow is separate from `npm run verify` because a compile, unit test, or build cannot prove that a player can navigate the fictional browser, persist an investigation, or reach an engine-gated ending through rendered controls.

Run it from a clean local session:

```sh
npm ci
npm run dev -- --port 5183
PLAYWRIGHT_CLI_SESSION=phantom-web-acceptance npx --yes --package @playwright/cli playwright-cli open http://127.0.0.1:5183/
PLAYWRIGHT_CLI_SESSION=phantom-web-acceptance npx --yes --package @playwright/cli playwright-cli run-code --filename scripts/headless-acceptance.js
```

The script uses role, label, and visible-text locators for product actions. It only uses page evaluation to clear the disposable local session at the start of each run and to read independent postconditions. It covers:

- fresh startup, prepared no-key mode, skip link, search announcements, hint rendering, locked-page keyboard activation, and the unavailable live-adapter fallback;
- the authored route through comparison, Mara, Ilya, the sealed packet, Noor, and the final terminal audit;
- source save, notebook annotation, clue connection, reload persistence, same-ID import replacement (`NOTE A` → `NOTE B`), valid save restore, malformed-save refusal, and safe restart;
- both “Wake the relay” and “Keep the harbor quiet” endings;
- 320px horizontal overflow, ARIA reference targets, reduced-motion transition output, failed network requests, browser console errors, and page errors.

The acceptance run is evidence for the prepared Chromium experience at the exact source head where it was run. It does not establish VoiceOver or NVDA announcements, Safari or Firefox behavior, live-provider behavior, production hosting, or a public release.

The notebook interaction is intentionally tested as a rapid user sequence: type a note, leave the field, immediately connect a clue, reload, and read the textarea value back. This catches stale React-session transitions that a reducer-only test cannot see.
