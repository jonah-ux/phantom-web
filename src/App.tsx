import { useMemo, useState } from 'react'
import { CANON, CORPUS } from './canon'
import type { CharacterId } from './canon'
import { annotateEvidence, applyModelProposal, askCharacter, chooseEnding, connectEvidence, createEmptySession, getInvestigationBoard, openDocument, readSession, recordLiveDialogue, requestHint, runTerminalCommand, saveEvidence, writeSession } from './engine'
import type { Session } from './engine'
import { searchCorpus } from './domain'
import { requestLiveResponse } from './live-adapter'
import './App.css'

const storageKey = 'phantom-web:session:v1'

function restoreSession(): { session: Session; message: string } {
  try {
    const raw = localStorage.getItem(storageKey)
    const session = readSession(raw)
    return { session: raw === null ? openDocument(session, 'welcome').session : session, message: '' }
  } catch {
    return { session: openDocument(createEmptySession(), 'welcome').session, message: 'The saved investigation could not be read. No imported progress was applied.' }
  }
}

function titleFor(documentId: string) {
  return CORPUS.documents.find(document => document.id === documentId)?.title ?? documentId
}

function requirementLabel(documentId: string) {
  const page = CORPUS.documents.find(document => document.id === documentId)
  if (!page || page.requiresClues.length === 0) return ''
  return page.requiresClues.map(clueId => CANON.clues.find(clue => clue.id === clueId)?.title ?? clueId).join(' + ')
}

function App() {
  const [initial] = useState(restoreSession)
  const [session, setSession] = useState(initial.session)
  const [message, setMessage] = useState(initial.message)
  const [query, setQuery] = useState('')
  const [hintText, setHintText] = useState('')
  const [solutionVisible, setSolutionVisible] = useState(false)
  const [importText, setImportText] = useState('')
  const [interactionMode, setInteractionMode] = useState<'prepared' | 'live'>('prepared')
  const [liveCharacterId, setLiveCharacterId] = useState<CharacterId>('mara')
  const [liveQuestion, setLiveQuestion] = useState('')
  const [liveBusy, setLiveBusy] = useState(false)
  const [liveMessage, setLiveMessage] = useState('')
  const liveEndpoint = (import.meta.env.VITE_PHANTOM_LIVE_ENDPOINT as string | undefined)?.trim() ?? ''
  const [clueFilter, setClueFilter] = useState('')

  const document = CORPUS.documents.find(page => page.id === session.activeDocument) ?? CORPUS.documents[0]
  const results = useMemo(() => searchCorpus(CORPUS, query), [query])
  const availableEndings = CANON.endings.filter(ending => ending.requires.every(clue => session.discoveredClues.includes(clue)))
  const board = getInvestigationBoard(session)

  function applyTransition<T>(transition: { session: Session; message: string; value?: T }) {
    setSession(transition.session)
    try { localStorage.setItem(storageKey, writeSession(transition.session)) }
    catch { setMessage('This session is playable, but local storage is unavailable. Your current tab remains active.') }
    setMessage(transition.message)
  }

  function open(documentId: string) {
    applyTransition(openDocument(session, documentId))
  }

  function saveCurrent() {
    applyTransition(saveEvidence(session, document.id, document.body.slice(0, 600)))
  }

  function restart() {
    const fresh = openDocument(createEmptySession(), 'welcome').session
    setSession(fresh)
    try { localStorage.setItem(storageKey, writeSession(fresh)) } catch { /* Keep the fresh tab usable without storage. */ }
    setHintText('')
    setSolutionVisible(false)
    setMessage('New investigation started. The archive has no memory of the previous witness.')
  }

  function importSave() {
    try {
      const imported = readSession(importText)
      setSession(imported)
      try { localStorage.setItem(storageKey, writeSession(imported)) } catch { /* Keep the imported session in memory. */ }
      setMessage('Saved investigation restored. Clues, notebook entries, and character memory are intact.')
      setImportText('')
    } catch {
      setMessage('That save was rejected. The current investigation was left untouched.')
    }
  }

  function ask(characterId: CharacterId, disclosureId: string) {
    const transition = askCharacter(session, characterId, disclosureId)
    applyTransition(transition)
  }

  async function askLive() {
    const prompt = liveQuestion.trim()
    if (!prompt || liveBusy) return
    setLiveBusy(true)
    setLiveMessage('Contacting the optional live adapter…')
    const result = await requestLiveResponse({ endpoint: liveEndpoint, session, characterId: liveCharacterId, prompt })
    if (result.status === 'ok' && result.proposal) {
      const applied = applyModelProposal(session, liveCharacterId, result.proposal)
      if (applied.accepted) {
        const recorded = recordLiveDialogue(applied.session, liveCharacterId, prompt, result.proposal.text)
        setSession(recorded.session)
        try { localStorage.setItem(storageKey, writeSession(recorded.session)) } catch { /* The live response remains visible in this tab. */ }
        setLiveMessage(`${result.detail} ${result.proposal.text}`)
      } else setLiveMessage(`The engine rejected the live proposal: ${applied.errors.join('; ')}`)
    } else setLiveMessage(result.detail)
    setLiveBusy(false)
  }

  function useHint() {
    const transition = requestHint(session)
    applyTransition(transition)
    if (transition.value) setHintText(transition.value)
  }

  function terminal(command: string) {
    applyTransition(runTerminalCommand(session, command))
  }

  function selectEnding(id: 'expose' | 'protect') {
    applyTransition(chooseEnding(session, id))
  }

  return <main className="app-shell">
    <header className="masthead">
      <div>
        <span className="eyebrow">PHANTOM WEB / ASTRA RELAY</span>
        <h1>The archive is awake.</h1>
        <p className="lede">A fictional internet mystery about a station that chose to disappear.</p>
      </div>
      <div className="session-identity" aria-label="fictional session identity">
        <span>WITNESS SESSION</span>
        <div className="mode-toggle" role="group" aria-label="Character interaction mode"><button className={interactionMode === 'prepared' ? 'mode-button mode-active' : 'mode-button'} onClick={() => setInteractionMode('prepared')}>PREPARED</button><button className={interactionMode === 'live' ? 'mode-button mode-active' : 'mode-button'} onClick={() => setInteractionMode('live')}>LIVE ADAPTER</button></div>
        <strong>{interactionMode === 'prepared' ? 'LOCAL / NO-KEY' : liveEndpoint ? 'LIVE / OPTIONAL' : 'LIVE / UNAVAILABLE'}</strong>
        <small>{interactionMode === 'prepared' ? 'Prepared responses are labeled. No real network or provider is contacted.' : liveEndpoint ? 'Only discovered, character-permitted context is sent to the configured server endpoint.' : 'No VITE_PHANTOM_LIVE_ENDPOINT is configured. Prepared mode remains complete.'}</small>
      </div>
    </header>

    <section className="status-bar" aria-live="polite">
      <span><b>{session.discoveredClues.length}</b> clues in the ledger</span>
      <span><b>{session.visitedDocuments.length}</b> pages opened</span>
      <span>{session.phase === 'complete' ? 'ENDING RECORDED' : 'INVESTIGATION IN PROGRESS'}</span>
      {message && <span className="status-message">{message}</span>}
    </section>

    <section className="browser panel" aria-label="Fictional browser">
      <div className="browser-tabs">
        <span className="browser-dot" aria-hidden="true" />
        {session.tabs.map(tab => <button key={tab} className={tab === document.id ? 'tab tab-active' : 'tab'} onClick={() => open(tab)}>{titleFor(tab)}</button>)}
        <button className="tab tab-add" onClick={() => open('welcome')} aria-label="Open a new archive tab">+</button>
      </div>
      <div className="address-bar"><span aria-hidden="true">⌁</span><span>{document.address}</span><small>simulated address · fiction only</small></div>
      <div className="browser-history"><span>History:</span>{session.history.slice(-6).map((item, index) => <button key={`${item}-${index}`} onClick={() => open(item)}>{titleFor(item)}</button>)}</div>
    </section>

    <section className="caseboard panel" aria-labelledby="caseboard-title">
      <div className="caseboard-heading"><div><span className="section-heading">FIELD BOARD <small>engine-sourced lead</small></span><h2 id="caseboard-title">Follow the signal before it fades.</h2></div><div className="board-progress"><strong>{board.progress}%</strong><span>evidence assembled</span><div className="progress-track" role="progressbar" aria-label="Investigation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={board.progress}><span style={{ width: `${board.progress}%` }} /></div></div></div>
      <p className="board-lead"><b>Next lead:</b> {board.nextAction}</p>
      <ol className="beat-list">{board.beats.map(beat => <li key={beat.id} className={`beat beat-${beat.status}`}><button className="beat-button" onClick={() => open(beat.documentId)} disabled={beat.status === 'locked'} aria-current={beat.status === 'active' ? 'step' : undefined}><span className="beat-number">{beat.label}</span><strong>{beat.status === 'complete' ? '✓ ' : ''}{beat.summary}</strong><small>{beat.discovered}/{beat.clueIds.length} engine clues · {beat.status === 'locked' ? 'locked until the prior beat' : beat.status === 'complete' ? 'complete' : 'active lead'}</small></button></li>)}</ol>
    </section>

    <div className="workspace">
      <aside className="sidebar">
        <section className="panel archive-nav">
          <div className="section-heading"><span>ARCHIVE INDEX</span><small>{CORPUS.documents.length} pages</small></div>
          <label htmlFor="search">Search authored pages</label>
          <input id="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try 03:17 or harbor" />
          <ul className="page-list">
            {(query ? results : CORPUS.documents).map(page => {
              const unlocked = page.requiresClues.every(clue => session.discoveredClues.includes(clue))
              return <li key={page.id}><button className={page.id === document.id ? 'page-link selected' : 'page-link'} onClick={() => open(page.id)} disabled={!unlocked} aria-label={unlocked ? page.title : `${page.title}; locked until ${requirementLabel(page.id)}`}><span>{unlocked ? '●' : '○'}</span>{page.title}</button>{!unlocked && <small className="lock-reason">Requires: {requirementLabel(page.id)}</small>}</li>
            })}
          </ul>
          {query && results.length === 0 && <p className="muted">No authored page matches that term.</p>}
          <p className="nav-note">Locked pages open only when the story engine recognizes their prerequisite clues.</p>
        </section>

        <section className="panel notebook-panel">
          <div className="section-heading"><span>NOTEBOOK</span><small>{session.evidence.length} sources</small></div>
          {session.evidence.length === 0 && <p className="muted">Save a passage to keep its source and attach a note.</p>}
          <input className="clue-filter" aria-label="Filter discovered clues" value={clueFilter} onChange={event => setClueFilter(event.target.value)} placeholder="Filter clues to connect" />
          <ul className="notebook-list">
            {session.evidence.map(entry => {
              const visibleClues = session.discoveredClues
                .map(clueId => CANON.clues.find(item => item.id === clueId))
                .filter((clue): clue is (typeof CANON.clues)[number] => Boolean(clue))
                .filter(clue => !clueFilter.trim() || `${clue.title} ${clue.text}`.toLowerCase().includes(clueFilter.trim().toLowerCase()))
              return <li key={entry.id}>
                <button className="notebook-link" onClick={() => open(entry.documentId)}>{titleFor(entry.documentId)}</button>
                <blockquote>{entry.quote}</blockquote>
                <textarea aria-label={`Note for ${titleFor(entry.documentId)}`} defaultValue={entry.note} placeholder="Why does this matter?" onBlur={event => applyTransition(annotateEvidence(session, entry.id, event.currentTarget.value, entry.highlighted))} />
                <label className="check-row"><input type="checkbox" checked={entry.highlighted} onChange={event => applyTransition(annotateEvidence(session, entry.id, entry.note, event.currentTarget.checked))} /> flag as suspicious</label>
                <div className="connection-row">{visibleClues.map(clue => <button key={clue.id} className={entry.connectedClueIds.includes(clue.id) ? 'chip chip-on' : 'chip'} onClick={() => applyTransition(connectEvidence(session, entry.id, clue.id))}><strong>{entry.connectedClueIds.includes(clue.id) ? '✓ ' : ''}{clue.title}</strong><small>{clue.kind}</small></button>)}</div>
                {entry.connectedClueIds.length > 0 && <p className="connected-note">Connected clues stay with this source after reload.</p>}
              </li>
            })}
          </ul>
        </section>
      </aside>

      <article className={`document panel document--${document.style}`}>
        <div className="document-meta"><span>{document.timestamp}</span><span>{document.style.replace('-', ' ')}</span></div>
        <h2>{document.title}</h2>
        <div className="document-body">{document.body}</div>
        <div className="document-actions"><button onClick={saveCurrent} disabled={session.evidence.some(entry => entry.documentId === document.id)}>{session.evidence.some(entry => entry.documentId === document.id) ? 'Source saved' : 'Save source to notebook'}</button><button className="secondary" onClick={() => setMessage(`Public facts on this page: ${document.facts.join(', ')}.`)}>Show public tags</button></div>
        <div className="linked-pages"><h3>Linked pages</h3>{document.links.map(link => { const unlocked = CORPUS.documents.find(page => page.id === link)!.requiresClues.every(clue => session.discoveredClues.includes(clue)); return <div key={link} className="linked-page"><button className="link-button" onClick={() => open(link)} disabled={!unlocked}>{titleFor(link)}</button>{!unlocked && <small className="lock-reason">Requires: {requirementLabel(link)}</small>}</div> })}</div>
      </article>

      <aside className="inspector">
        <section className="panel clue-panel">
          <div className="section-heading"><span>CLUE LEDGER</span><small>{session.discoveredClues.length}/{CANON.clues.length}</small></div>
          <div className="clue-grid">{session.discoveredClues.map(clueId => { const clue = CANON.clues.find(item => item.id === clueId)!; return <article key={clueId} className={clue.redHerring ? 'clue-card red-herring' : 'clue-card'}><span className="clue-kind">{clue.kind}</span><h3>{clue.title}</h3><p>{clue.text}</p>{clue.redHerring && <small>Intentional red herring · does not unlock an ending</small>}</article> })}</div>
          {session.discoveredClues.length === 0 && <p className="muted">The ledger stays empty until you open an authored source.</p>}
        </section>

        <section className="panel people-panel">
          <div className="section-heading"><span>WITNESSES</span><small>prepared mode</small></div>
          <p className="muted">Each witness has a motive and a narrow disclosure gate. Their responses cannot change the canon on their own.</p>
          {CANON.characters.map(character => { const ready = character.disclosures.some(disclosure => disclosure.requires.every(clue => session.discoveredClues.includes(clue))); const transcript = session.characterMemory[character.id] ?? []; return <article key={character.id} className={ready ? 'character-card ready' : 'character-card'}><div className="character-top"><div><h3>{character.name}</h3><span>{character.role}</span></div><b>{ready ? 'READY' : 'WAITING'}</b></div><p>{character.motive}</p><div className="character-prompts">{character.disclosures.map(disclosure => { const available = disclosure.requires.every(clue => session.discoveredClues.includes(clue)); const asked = transcript.some(turn => turn.disclosureId === disclosure.id); return <button key={disclosure.id} className="prompt-button" disabled={!available} onClick={() => ask(character.id, disclosure.id)}>{asked ? '✓ ' : ''}{disclosure.label}</button> })}</div>{transcript.length > 0 && <div className="transcript" aria-live="polite"><span className="transcript-label">CONVERSATION / {character.name}</span>{transcript.map((turn, index) => <div className="transcript-turn" key={`${turn.disclosureId}-${index}`}><p className="transcript-prompt"><b>YOU</b> {turn.prompt}</p><p className="transcript-response"><b>{character.name.toUpperCase()}</b> {turn.response}</p><small>{turn.mode === 'prepared' ? 'PREPARED RESPONSE' : 'LIVE RESPONSE'}</small></div>)}</div>}<p className="character-note">Prepared prompts are the authored questions for this witness. Use LIVE ADAPTER below for an unexpected question.</p></article> })}
        </section>

        {interactionMode === 'live' && <section className="panel live-panel"><div className="section-heading"><span>LIVE CHARACTER ADAPTER</span><small>{liveEndpoint ? 'server endpoint configured' : 'no endpoint configured'}</small></div><p className="muted">Live mode sends only this prompt, discovered clues known by the selected character, recent authored pages, and that character's bounded memory. A response is inert until the engine validates its claims and actions.</p><div className="live-controls"><label htmlFor="live-character">Witness</label><select id="live-character" value={liveCharacterId} onChange={event => setLiveCharacterId(event.target.value as CharacterId)}>{CANON.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}</select><label htmlFor="live-question">Question</label><input id="live-question" value={liveQuestion} onChange={event => setLiveQuestion(event.target.value)} placeholder="Ask a question the prepared prompts do not cover" /><button onClick={() => { void askLive() }} disabled={!liveQuestion.trim() || liveBusy}>{liveBusy ? 'Waiting…' : 'Ask live adapter'}</button></div>{liveMessage && <p className="live-message" role="status">{liveMessage}</p>}</section>}

        <section className="panel hint-panel">
          <div className="section-heading"><span>HINT LADDER</span><small>{session.hintsUsed}/{CANON.hints.length}</small></div>
          <button onClick={useHint} disabled={session.hintsUsed >= CANON.hints.length}>Request next hint</button>
          {hintText && <p className="hint-text">{hintText}</p>}
        </section>

        {document.id === 'message-console' && <section className="panel terminal-panel"><div className="section-heading"><span>LOCAL TERMINAL</span><small>state-bound</small></div><div className="terminal-output">{session.events.filter(event => event.type === 'terminal-command').map(event => <div key={event.id}>{event.detail} :: accepted</div>)}{session.events.filter(event => event.type === 'terminal-command').length === 0 && <div>awaiting command…</div>}</div><div className="terminal-buttons"><button onClick={() => terminal('COMPARE CLOCKS')}>COMPARE CLOCKS</button><button onClick={() => terminal('AUDIT PACKET')} disabled={!session.discoveredClues.includes('crew-survived')}>AUDIT PACKET</button></div></section>}

        {availableEndings.length > 0 && <section className="panel ending-panel"><div className="section-heading"><span>FINAL DECISION</span><small>engine gate open</small></div><p>The packet is complete enough to choose. The character who corroborated your chain determines which ending is available.</p>{availableEndings.map(ending => <button key={ending.id} className="ending-button" onClick={() => selectEnding(ending.id)} disabled={Boolean(session.ending)}><strong>{ending.title}</strong><span>{ending.decision}</span></button>)}{session.ending && <div className="ending-result"><span>ENDING / {session.ending.toUpperCase()}</span><p>{CANON.endings.find(ending => ending.id === session.ending)?.text}</p></div>}</section>}

        <section className="panel save-panel"><div className="section-heading"><span>SESSION CONTROLS</span><small>local only</small></div><div className="control-row"><button className="secondary" onClick={restart}>Restart investigation</button><button className="secondary" onClick={() => setSolutionVisible(value => !value)}>{solutionVisible ? 'Hide author solution' : 'Reveal author solution'}</button></div><details><summary>Export or restore a save</summary><textarea value={importText} onChange={event => setImportText(event.target.value)} placeholder="Paste a phantom-web/session/v1 save here" /><div className="control-row"><button className="secondary" onClick={() => { try { setImportText(writeSession(session)); setMessage('Current session serialized below.') } catch { setMessage('Current session could not be serialized.') } }}>Prepare current save</button><button onClick={importSave} disabled={!importText.trim()}>Restore save</button></div></details>{solutionVisible && <div className="solution-warning"><strong>AUTHOR VIEW / SPOILERS</strong>{CANON.endings.map(ending => <p key={ending.id}><b>{ending.title}:</b> requires {ending.requires.join(' + ')}.</p>)}</div>}</section>
      </aside>
    </div>

    <footer>All institutions, people, pages, and events are fictional. Prepared mode requires no key. Optional live AI remains a separate, unverified adapter.</footer>
  </main>
}

export default App
