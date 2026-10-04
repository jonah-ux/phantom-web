/* oxlint-disable no-unused-expressions */
async page => {
  const failures = [];
  const consoleErrors = [];
  const pageErrors = [];
  page.on('requestfailed', request => failures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));

  const check = (condition, detail) => { if (!condition) throw new Error(detail); };
  const archive = () => page.getByRole('region', { name: 'ARCHIVE INDEX' });
  const witnesses = () => page.getByRole('region', { name: 'WITNESSES' });
  const status = () => page.getByRole('region', { name: 'Investigation status' });
  const ledger = () => page.getByRole('region', { name: 'CLUE LEDGER' });
  const sessionSave = () => page.locator('#session-save');
  const browserState = () => page.evaluate(() => {
    const raw = localStorage.getItem('phantom-web:session:v1');
    const session = raw ? JSON.parse(raw) : null;
    return { active: session?.activeDocument ?? null, clues: session?.discoveredClues ?? null, status: document.querySelector('.status-bar')?.innerText ?? '' };
  });
  const openPage = async title => {
    const button = archive().getByRole('button', { name: title, exact: true });
    let disabled = await button.getAttribute('aria-disabled');
    for (let attempt = 0; attempt < 30 && disabled === 'true'; attempt += 1) {
      await page.waitForTimeout(50);
      disabled = await button.getAttribute('aria-disabled');
    }
    check(disabled !== 'true', `Expected page to unlock before opening: ${title}; state=${JSON.stringify(await browserState())}`);
    const beforeClick = { disabled, state: await browserState() };
    try {
      await button.click();
    } catch (error) {
      throw new Error(`Opening ${title} failed after unlock readback ${JSON.stringify(beforeClick)}: ${String(error)}`);
    }
    await page.locator('#document-title').waitFor({ state: 'visible' });
  };
  const clueVisible = async title => ledger().getByText(title, { exact: true }).count();
  const reset = async () => {
    await page.goto('http://127.0.0.1:5183/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  };
  const openControls = async () => {
    const details = page.locator('details');
    if (!(await details.getAttribute('open'))) await details.locator('summary').click();
  };
  const routeToComparison = async () => {
    await openPage('Staff directory / last roster');
    check(await clueVisible('The fourth voice') === 1, 'Directory did not reveal the roster-gap clue');
    await openPage('Maintenance log / receiver bay');
    check(await clueVisible('The slow receiver clock') === 1, 'Maintenance log did not reveal the clock clue');
    await openPage('News archive / The relay goes dark');
    check(await clueVisible('The impossible postmark') === 1, 'News clipping did not reveal the postmark clue');
    await openPage('Relay terminal / message console');
    await page.getByRole('button', { name: 'COMPARE CLOCKS', exact: true }).click();
    check(await clueVisible('The pulse was outbound') === 1, 'COMPARE CLOCKS did not reveal the comparison clue');
    check((await page.getByRole('log').innerText()).includes('COMPARE CLOCKS'), 'Terminal did not record the comparison command');
  };
  const routeToPacket = async () => {
    await routeToComparison();
    await openPage('Mara Vale / margin index');
    await witnesses().getByRole('button', { name: /Ask about the triangle/ }).click();
    check(await clueVisible('The triangle key') === 1, 'Mara did not reveal the triangle clue');
    check((await page.getByRole('log', { name: 'Conversation with Mara Vale' }).innerText()).includes('PREPARED RESPONSE'), 'Mara transcript did not render');
    await openPage('Ilya Sen / receiver notebook');
    await witnesses().getByRole('button', { name: /Ask about the blue channel/ }).click();
    await witnesses().getByRole('button', { name: /Ask why it stayed dark/ }).click();
    check(await clueVisible('The maintenance signature') === 1, 'Ilya did not reveal the maintenance signature');
    check(await clueVisible('Why the relay stayed dark') === 1, 'Ilya did not reveal the quarantine reason');
    await openPage('Correspondence / sealed departure packet');
    check(await clueVisible('The crew survived') === 1, 'Correspondence did not reveal crew survival');
  };
  const finishWithWitness = async (witnessName, endingName) => {
    await routeToPacket();
    if (witnessName === 'Noor') {
      await openPage('Noor Calder / field notebook');
      await witnesses().getByRole('button', { name: /Ask for corroboration/ }).click();
      check(await clueVisible('A second witness') === 1, 'Noor did not reveal corroboration');
    } else {
      await witnesses().getByRole('button', { name: /Ask about the harbor/ }).click();
      check(await clueVisible('The privacy request') === 1, 'Mara did not reveal the privacy request');
    }
    await openPage('Relay terminal / message console');
    await page.getByRole('button', { name: 'AUDIT PACKET', exact: true }).click();
    check(await clueVisible('The packet is complete') === 1, 'AUDIT PACKET did not reveal packet completion');
    await page.getByRole('button', { name: new RegExp(endingName) }).click();
    check((await status().innerText()).includes('ENDING RECORDED'), `Ending ${endingName} was not recorded`);
    check((await page.getByRole('region', { name: 'FINAL DECISION' }).innerText()).includes(endingName), `Ending result did not render for ${endingName}`);
  };

  await reset();
  check((await status().innerText()).includes('1 pages opened'), 'Fresh session did not open the welcome page');
  check((await page.getByLabel('fictional session identity').innerText()).includes('LOCAL / NO-KEY'), 'Prepared no-key mode is not visible');
  check(await page.getByRole('link', { name: 'Skip to investigation' }).count() === 1, 'Skip link is missing');

  await page.getByRole('region', { name: 'ARCHIVE INDEX' }).getByRole('textbox', { name: 'Search authored pages' }).fill('03:17');
  check(await page.getByRole('region', { name: 'ARCHIVE INDEX' }).getByRole('button', { name: 'Maintenance log / receiver bay', exact: true }).count() === 1, 'Authored search did not find the 03:17 maintenance page');
  check((await page.locator('.sr-only').innerText()).includes('authored pages match 03:17'), 'Search result announcement did not update');
  await page.getByRole('region', { name: 'ARCHIVE INDEX' }).getByRole('textbox', { name: 'Search authored pages' }).fill('');

  await page.getByRole('button', { name: 'Request next hint', exact: true }).click();
  check((await page.getByRole('region', { name: 'HINT LADDER' }).innerText()).includes('Open the maintenance log and the news clipping'), 'First hint body did not render in the hint ladder');
  check((await status().innerText()).includes('Hint: A clock is a clue'), 'First hint label was not announced in status');

  const lockedStateBefore = await page.evaluate(() => localStorage.getItem('phantom-web:session:v1'));
  const lockedForum = archive().getByRole('button', { name: /Relay forum \/ Is 03:17 an arrival\?/ });
  check(await lockedForum.getAttribute('aria-disabled') === 'true', 'Forum is not visibly locked in a fresh session');
  await lockedForum.focus();
  await page.keyboard.press('Enter');
  check(await page.evaluate(() => localStorage.getItem('phantom-web:session:v1')) === lockedStateBefore, 'Locked forum activation changed session state');
  check((await status().innerText()).includes('Requires:'), 'Locked forum activation did not explain its prerequisites');

  await page.getByRole('button', { name: 'LIVE ADAPTER', exact: true }).click();
  await page.getByRole('textbox', { name: 'Question', exact: true }).fill('What can you tell me about the relay?');
  await page.getByRole('button', { name: 'Ask live adapter', exact: true }).click();
  check((await page.getByRole('status').innerText()).includes('No live adapter endpoint is configured'), 'No-key live fallback did not render');
  await page.getByRole('button', { name: 'PREPARED', exact: true }).click();

  await routeToComparison();
  await openPage('Relay forum / Is 03:17 an arrival?');
  check((await page.locator('#document-title').innerText()).includes('Is 03:17 an arrival?'), 'Unlocked forum did not render');
  await page.screenshot({ path: 'output/playwright/headless-comparison.png', fullPage: false });

  await openControls();
  await openPage('Maintenance log / receiver bay');
  await page.getByRole('button', { name: 'Save source to notebook', exact: true }).click();
  const notebookEntry = page.getByRole('region', { name: 'NOTEBOOK' }).getByRole('button', { name: 'Maintenance log / receiver bay', exact: true });
  check(await notebookEntry.count() === 1, 'Saved source did not appear in the notebook');
  const note = page.getByRole('region', { name: 'NOTEBOOK' }).getByRole('textbox', { name: 'Note for Maintenance log / receiver bay', exact: true });
  await note.fill('The blue channel is the lead.');
  await note.blur();
  const noteAfterBlur = await page.evaluate(() => JSON.parse(localStorage.getItem('phantom-web:session:v1') || '{}').evidence?.[0]?.note);
  check(noteAfterBlur === 'The blue channel is the lead.', `Notebook note was not saved on blur; storage=${JSON.stringify(noteAfterBlur)}`);
  const clueChip = page.getByRole('region', { name: 'NOTEBOOK' }).getByRole('button', { name: /The slow receiver clock/ }).first();
  await clueChip.click();
  const noteAfterChip = await page.evaluate(() => JSON.parse(localStorage.getItem('phantom-web:session:v1') || '{}').evidence?.[0]?.note);
  check(noteAfterChip === 'The blue channel is the lead.', `Notebook note was lost during clue connection; storage=${JSON.stringify(noteAfterChip)}`);
  await page.reload();
  const notebookAfterReload = await page.getByRole('region', { name: 'NOTEBOOK' }).innerText();
  const restoredNote = await page.getByRole('region', { name: 'NOTEBOOK' }).getByRole('textbox', { name: 'Note for Maintenance log / receiver bay', exact: true }).inputValue();
  check(restoredNote === 'The blue channel is the lead.', `Notebook note did not survive reload; inputValue=${JSON.stringify(restoredNote)}`);
  check(notebookAfterReload.includes('Connected clues stay with this source after reload.'), `Notebook clue connection did not survive reload; rendered=${JSON.stringify(notebookAfterReload)}`);
  await openControls();
  await page.getByRole('button', { name: 'Prepare current save', exact: true }).click();
  const midStorySave = await sessionSave().inputValue();
  check(midStorySave.includes('phantom-web/session/v1'), 'Prepared save does not contain the session schema');
  await page.getByRole('button', { name: 'Restart investigation', exact: true }).click();
  check((await status().innerText()).includes('0 clues in the ledger'), 'Restart did not clear the investigation');
  await sessionSave().fill(midStorySave);
  await page.getByRole('button', { name: 'Restore save', exact: true }).click();
  check((await status().innerText()).includes('5 clues in the ledger'), 'Restored save did not recover discovered clues');
  const restoredState = await page.evaluate(() => localStorage.getItem('phantom-web:session:v1'));
  await sessionSave().fill('{not a phantom save');
  await page.getByRole('button', { name: 'Restore save', exact: true }).click();
  check((await status().innerText()).includes('That save was rejected'), 'Malformed save did not produce a safe refusal');
  check(await page.evaluate(() => localStorage.getItem('phantom-web:session:v1')) === restoredState, 'Malformed save partially changed the restored session');

  await reset();
  await finishWithWitness('Noor', 'Wake the relay');
  await page.screenshot({ path: 'output/playwright/headless-expose-ending.png', fullPage: false });

  await reset();
  await finishWithWitness('Mara', 'Keep the harbor quiet');
  await page.screenshot({ path: 'output/playwright/headless-protect-ending.png', fullPage: false });

  await page.setViewportSize({ width: 320, height: 900 });
  check(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), '320px browser layout overflows horizontally');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const ariaTargets = await page.evaluate(() => [...document.querySelectorAll('[aria-labelledby],[aria-describedby]')].flatMap(element => ['aria-labelledby', 'aria-describedby'].flatMap(attribute => (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean).filter(id => !document.getElementById(id)))));
  check(ariaTargets.length === 0, `ARIA references are missing: ${ariaTargets.join(', ')}`);
  const reducedMotion = await page.evaluate(() => { const bar = document.querySelector('.progress-track span'); return bar ? getComputedStyle(bar).transitionDuration : null; });
  check(reducedMotion === '0.01ms' || reducedMotion === '1e-05s', `Reduced-motion progress transition was ${reducedMotion}`);

  check(failures.length === 0, `Headless browser requests failed: ${failures.join(' | ')}`);
  check(consoleErrors.length === 0, `Headless browser console errors: ${consoleErrors.join(' | ')}`);
  check(pageErrors.length === 0, `Headless browser page errors: ${pageErrors.join(' | ')}`);
  return {
    browser: 'Playwright Chromium headless',
    freshSession: true,
    lockedNavigationGuarded: true,
    noKeyFallback: true,
    comparisonRoute: true,
    saveRestore: true,
    malformedSaveRefusedWithoutMutation: true,
    endings: ['Wake the relay', 'Keep the harbor quiet'],
    viewport: { width: 320, scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth) },
    ariaTargets,
    reducedMotionTransitionDuration: reducedMotion,
    requestFailures: failures,
    consoleErrors,
    pageErrors,
  };
}
