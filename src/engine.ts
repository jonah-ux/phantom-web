import { z } from 'zod'
import {
  CANON,
  CANON_VERSION,
  CORPUS,
  STORY_ID,
  assertCanonValid,
} from './canon'
import type { CharacterId, EndingId } from './canon'
import { id } from './domain'

assertCanonValid()

const storageId = z.string().regex(/^[a-z][a-z0-9:-]{0,79}$/)

export type StoryPhase = 'investigating' | 'complete'
export type EventType = 'document-opened' | 'clue-discovered' | 'dialogue' | 'terminal-command' | 'hint-used' | 'ending-reached'

export interface EvidenceEntry {
  id: string
  documentId: string
  quote: string
  note: string
  highlighted: boolean
  connectedClueIds: string[]
}

export interface DialogueTurn {
  disclosureId: string
  prompt: string
  response: string
  mode: 'prepared' | 'live' | 'live-fixture'
}

export interface StoryEvent {
  id: string
  type: EventType
  detail: string
}

export interface Session {
  schema: 'phantom-web/session/v1'
  storyId: typeof STORY_ID
  canonVersion: typeof CANON_VERSION
  phase: StoryPhase
  activeDocument: string
  tabs: string[]
  history: string[]
  visitedDocuments: string[]
  discoveredClues: string[]
  evidence: EvidenceEntry[]
  characterMemory: Record<string, DialogueTurn[]>
  hintsUsed: number
  events: StoryEvent[]
  ending: EndingId | null
}

export interface Transition<T = undefined> {
  session: Session
  changed: boolean
  message: string
  value?: T
}

export type InvestigationBeatId = 'signal' | 'witnesses' | 'packet' | 'choice'
export type InvestigationBeatStatus = 'locked' | 'active' | 'complete'

export interface InvestigationBeat {
  id: InvestigationBeatId
  label: string
  summary: string
  documentId: string
  clueIds: string[]
  discovered: number
  status: InvestigationBeatStatus
}

export interface InvestigationBoard {
  nextAction: string
  progress: number
  beats: InvestigationBeat[]
}

const evidenceSchema = z.object({
  id: storageId,
  documentId: id,
  quote: z.string().min(1).max(600),
  note: z.string().max(500),
  highlighted: z.boolean(),
  connectedClueIds: z.array(id).max(20),
}).strict()

const dialogueSchema = z.object({
  disclosureId: id,
  prompt: z.string().min(1).max(1200),
  response: z.string().min(1).max(2000),
  mode: z.enum(['prepared', 'live', 'live-fixture']),
}).strict()

const eventSchema = z.object({
  id: storageId,
  type: z.enum(['document-opened', 'clue-discovered', 'dialogue', 'terminal-command', 'hint-used', 'ending-reached']),
  detail: z.string().min(1).max(300),
}).strict()

export const SessionSchema = z.object({
  schema: z.literal('phantom-web/session/v1'),
  storyId: z.literal(STORY_ID),
  canonVersion: z.literal(CANON_VERSION),
  phase: z.enum(['investigating', 'complete']),
  activeDocument: id,
  tabs: z.array(id).max(20),
  history: z.array(id).max(80),
  visitedDocuments: z.array(id).max(30),
  discoveredClues: z.array(id).max(50),
  evidence: z.array(evidenceSchema).max(50),
  characterMemory: z.record(z.string(), z.array(dialogueSchema).max(20)),
  hintsUsed: z.number().int().min(0).max(CANON.hints.length),
  events: z.array(eventSchema).max(200),
  ending: z.enum(['expose', 'protect']).nullable(),
}).strict()

const modelActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('grant-clue'), clueId: id, disclosureId: id }).strict(),
])

export const ModelProposalSchema = z.object({
  schema: z.literal('phantom-web/model-response/v1'),
  text: z.string().min(1).max(2000),
  claims: z.array(id).max(10),
  actions: z.array(modelActionSchema).max(5),
}).strict()

export type ModelProposal = z.infer<typeof ModelProposalSchema>
export type ModelAction = z.infer<typeof modelActionSchema>

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function eventId(session: Session, prefix: string) {
  return `${prefix}:${session.events.length + 1}`
}

function has(session: Session, clueId: string) {
  return session.discoveredClues.includes(clueId)
}

function requirementsMet(session: Session, requirements: string[]) {
  return requirements.every(requirement => has(session, requirement))
}

function findDocument(documentId: string) {
  return CORPUS.documents.find(document => document.id === documentId)
}

function findClue(clueId: string) {
  return CANON.clues.find(clue => clue.id === clueId)
}

function findCharacter(characterId: string) {
  return CANON.characters.find(character => character.id === characterId)
}

function findEnding(endingId: EndingId) {
  return CANON.endings.find(ending => ending.id === endingId)
}

function appendEvent(session: Session, type: EventType, detail: string, stableId?: string) {
  const id = stableId ?? eventId(session, type)
  if (session.events.some(event => event.id === id)) return
  session.events.push({ id, type, detail })
}

function grantClue(session: Session, clueId: string, source: string) {
  const clue = findClue(clueId)
  if (!clue || has(session, clueId) || !requirementsMet(session, clue.requires)) return false
  session.discoveredClues.push(clueId)
  appendEvent(session, 'clue-discovered', `${clueId} via ${source}`, `clue:${clueId}`)
  return true
}

export function createEmptySession(): Session {
  return {
    schema: 'phantom-web/session/v1',
    storyId: STORY_ID,
    canonVersion: CANON_VERSION,
    phase: 'investigating',
    activeDocument: 'welcome',
    tabs: ['welcome'],
    history: [],
    visitedDocuments: [],
    discoveredClues: [],
    evidence: [],
    characterMemory: {},
    hintsUsed: 0,
    events: [],
    ending: null,
  }
}

export function availableDocuments(session: Session) {
  return CORPUS.documents.filter(document => requirementsMet(session, document.requiresClues))
}

export function getInvestigationBoard(session: Session): InvestigationBoard {
  const hasAll = (clues: string[]) => clues.every(clue => has(session, clue))
  const signalClues = ['clock-0317', 'postmark-0317', 'repeat-is-local']
  const witnessClues = ['archivist-redaction-key', 'maintenance-signature', 'quarantine-reason']
  const packetClues = ['crew-survived', 'decision-ready']
  const choiceClues = ['reporter-confirmation', 'archivist-request']
  const signalComplete = hasAll(signalClues)
  const witnessesComplete = hasAll(witnessClues)
  const packetComplete = hasAll(packetClues)
  const choiceComplete = Boolean(session.ending)
  const beats: InvestigationBeat[] = [
    {
      id: 'signal', label: '01 / SIGNAL', summary: 'Compare the two 03:17 records.', documentId: 'message-console', clueIds: signalClues,
      discovered: signalClues.filter(clue => has(session, clue)).length, status: signalComplete ? 'complete' : 'active',
    },
    {
      id: 'witnesses', label: '02 / WITNESSES', summary: 'Ask the people who kept the route alive.', documentId: 'mara-personal', clueIds: witnessClues,
      discovered: witnessClues.filter(clue => has(session, clue)).length, status: witnessesComplete ? 'complete' : signalComplete ? 'active' : 'locked',
    },
    {
      id: 'packet', label: '03 / PACKET', summary: 'Reconstruct the departure without exposing it.', documentId: 'correspondence', clueIds: packetClues,
      discovered: packetClues.filter(clue => has(session, clue)).length, status: packetComplete ? 'complete' : signalComplete ? 'active' : 'locked',
    },
    {
      id: 'choice', label: '04 / CHOICE', summary: 'Decide whether the relay should wake.', documentId: 'decision-archive', clueIds: choiceClues,
      discovered: choiceClues.filter(clue => has(session, clue)).length, status: choiceComplete ? 'complete' : packetComplete ? 'active' : 'locked',
    },
  ]
  const nextAction = session.ending
    ? 'This witness has closed the archive. Restart to explore the other ending.'
    : !has(session, 'clock-0317') || !has(session, 'postmark-0317')
      ? 'Open the maintenance log and the news clipping. The same timestamp appears twice.'
      : !has(session, 'repeat-is-local')
        ? 'Run COMPARE CLOCKS in the relay terminal.'
        : !has(session, 'archivist-redaction-key')
          ? 'Ask Mara about the small triangle in the margins.'
          : !has(session, 'crew-survived')
            ? 'Follow the triangle to the sealed departure packet.'
            : !has(session, 'maintenance-signature')
              ? 'Ask Ilya whether blue was really weather interference.'
              : !has(session, 'shift-roster-gap')
                ? 'Open the station directory to inspect the missing shift before asking Ilya why the relay stayed dark.'
              : !has(session, 'quarantine-reason')
                ? 'Ask Ilya why the relay stayed dark.'
                : !has(session, 'reporter-confirmation') && !has(session, 'archivist-request')
                  ? 'Choose a witness: Noor can corroborate, or Mara can request privacy.'
                  : !has(session, 'decision-ready')
                    ? 'Run AUDIT PACKET in the relay terminal.'
                    : 'Choose the ending that matches your witness.'
  const total = beats.reduce((sum, beat) => sum + beat.clueIds.length, 0)
  const discovered = beats.reduce((sum, beat) => sum + beat.discovered, 0)
  return { nextAction, progress: Math.round((discovered / total) * 100), beats }
}

export function isDocumentAvailable(session: Session, documentId: string) {
  const document = findDocument(documentId)
  return Boolean(document && requirementsMet(session, document.requiresClues))
}

export function openDocument(session: Session, documentId: string): Transition {
  const document = findDocument(documentId)
  if (!document) return { session, changed: false, message: 'That fictional address does not exist.' }
  if (!requirementsMet(session, document.requiresClues)) return { session, changed: false, message: 'This page is still behind an evidence gate.' }
  const next = clone(session)
  const firstOpen = !next.visitedDocuments.includes(documentId)
  if (firstOpen) {
    next.visitedDocuments.push(documentId)
    appendEvent(next, 'document-opened', documentId, `document:${documentId}`)
    for (const clueId of document.revealsClues) grantClue(next, clueId, `document:${documentId}`)
  }
  next.activeDocument = documentId
  next.tabs = [...next.tabs.filter(tab => tab !== documentId), documentId].slice(-8)
  next.history = [...next.history, documentId].slice(-40)
  return { session: next, changed: firstOpen, message: firstOpen ? `Opened ${document.title}.` : `Reopened ${document.title}; no rewards were duplicated.` }
}

export function saveEvidence(session: Session, documentId: string, quote?: string): Transition<EvidenceEntry> {
  const document = findDocument(documentId)
  if (!document || !isDocumentAvailable(session, documentId)) return { session, changed: false, message: 'That source is not available to save.' }
  const chosenQuote = (quote ?? document.body).trim()
  if (!chosenQuote || !document.body.includes(chosenQuote)) return { session, changed: false, message: 'Evidence must be a passage from the authored source.' }
  const existing = session.evidence.find(entry => entry.documentId === documentId && entry.quote === chosenQuote)
  if (existing) return { session, changed: false, message: 'That passage is already in the notebook.', value: existing }
  const next = clone(session)
  const entry: EvidenceEntry = { id: `evidence:${next.evidence.length + 1}`, documentId, quote: chosenQuote.slice(0, 600), note: '', highlighted: false, connectedClueIds: [] }
  next.evidence.push(entry)
  return { session: next, changed: true, message: 'Sourced passage saved to the notebook.', value: entry }
}

export function annotateEvidence(session: Session, evidenceId: string, note: string, highlighted = true): Transition<EvidenceEntry> {
  const index = session.evidence.findIndex(entry => entry.id === evidenceId)
  if (index < 0) return { session, changed: false, message: 'That notebook entry does not exist.' }
  const next = clone(session)
  next.evidence[index].note = note.slice(0, 500)
  next.evidence[index].highlighted = highlighted
  return { session: next, changed: true, message: 'Notebook annotation updated.', value: next.evidence[index] }
}

export function connectEvidence(session: Session, evidenceId: string, clueId: string): Transition<EvidenceEntry> {
  const entry = session.evidence.find(item => item.id === evidenceId)
  if (!entry || !findClue(clueId)) return { session, changed: false, message: 'Evidence or clue does not exist.' }
  if (entry.connectedClueIds.includes(clueId)) return { session, changed: false, message: 'That connection is already recorded.', value: entry }
  const next = clone(session)
  const updated = next.evidence.find(item => item.id === evidenceId)!
  updated.connectedClueIds.push(clueId)
  return { session: next, changed: true, message: 'Evidence connected to a clue.', value: updated }
}

export function askCharacter(session: Session, characterId: CharacterId, disclosureId: string): Transition<DialogueTurn> {
  const character = findCharacter(characterId)
  const disclosure = character?.disclosures.find(item => item.id === disclosureId)
  if (!character || !disclosure) return { session, changed: false, message: 'That prepared character prompt does not exist.' }
  if (!requirementsMet(session, disclosure.requires)) return { session, changed: false, message: `${character.name} is not ready to answer that yet.` }
  const memory = session.characterMemory[characterId] ?? []
  const existing = memory.find(turn => turn.disclosureId === disclosureId)
  if (existing) return { session, changed: false, message: 'The prepared answer is already in this conversation.', value: existing }
  const next = clone(session)
  const turn: DialogueTurn = { disclosureId, prompt: disclosure.prompt, response: disclosure.response, mode: 'prepared' }
  next.characterMemory[characterId] = [...(next.characterMemory[characterId] ?? []), turn]
  appendEvent(next, 'dialogue', `${characterId}:${disclosureId}`, `dialogue:${characterId}:${disclosureId}`)
  if (disclosure.reveals) grantClue(next, disclosure.reveals, `character:${characterId}`)
  return { session: next, changed: true, message: `${character.name} answered in prepared mode.`, value: turn }
}

export function recordLiveDialogue(session: Session, characterId: CharacterId, prompt: string, response: string): Transition<DialogueTurn> {
  const character = findCharacter(characterId)
  const cleanPrompt = prompt.trim().slice(0, 1200)
  const cleanResponse = response.trim().slice(0, 2000)
  if (!character || !cleanPrompt || !cleanResponse) return { session, changed: false, message: 'The live dialogue could not be recorded.' }
  const next = clone(session)
  const memoryIds = (next.characterMemory[characterId] ?? [])
    .filter(turn => turn.mode === 'live' || turn.mode === 'live-fixture')
    .map(turn => Number(turn.disclosureId.replace('live-', '')))
    .filter(Number.isInteger)
  const eventIds = next.events
    .filter(event => event.type === 'dialogue' && event.id.startsWith(`dialogue:${characterId}:live-`))
    .map(event => Number(event.id.replace(`dialogue:${characterId}:live-`, '')))
    .filter(Number.isInteger)
  const nextLiveNumber = Math.max(0, ...memoryIds, ...eventIds) + 1
  const turn: DialogueTurn = {
    disclosureId: `live-${nextLiveNumber}`,
    prompt: cleanPrompt,
    response: cleanResponse,
    mode: 'live',
  }
  next.characterMemory[characterId] = [...(next.characterMemory[characterId] ?? []), turn].slice(-20)
  appendEvent(next, 'dialogue', `${characterId}:${turn.disclosureId}`, `dialogue:${characterId}:${turn.disclosureId}`)
  return { session: next, changed: true, message: `${character.name} answered through the optional live adapter.`, value: turn }
}

export function runTerminalCommand(session: Session, rawCommand: string): Transition {
  const command = rawCommand.trim().toUpperCase()
  if (!['COMPARE CLOCKS', 'AUDIT PACKET', 'RESTART'].includes(command)) return { session, changed: false, message: 'Unknown command. Try COMPARE CLOCKS or AUDIT PACKET.' }
  if (command === 'RESTART') return { session: createEmptySession(), changed: true, message: 'The fictional terminal cleared this session. No outside data was touched.' }
  const next = clone(session)
  if (command === 'COMPARE CLOCKS') {
    if (!requirementsMet(next, ['clock-0317', 'postmark-0317'])) return { session, changed: false, message: 'The terminal needs both 03:17 sources before it can compare them.' }
    const discovered = grantClue(next, 'repeat-is-local', 'terminal:compare-clocks')
    if (!discovered) return { session, changed: false, message: 'The clocks are already compared; retrying is safe.' }
    appendEvent(next, 'terminal-command', command, 'terminal:compare-clocks')
    return { session: next, changed: true, message: 'Comparison complete: the pulse was outbound.' }
  }
  if (!requirementsMet(next, ['crew-survived', 'quarantine-reason']) || (!has(next, 'reporter-confirmation') && !has(next, 'archivist-request'))) {
    return { session, changed: false, message: 'The packet needs the departure, its reason, and one witness before audit.' }
  }
  const discovered = grantClue(next, 'decision-ready', 'terminal:audit-packet')
  if (!discovered) return { session, changed: false, message: 'The packet is already audited; retrying is safe.' }
  appendEvent(next, 'terminal-command', command, 'terminal:audit-packet')
  return { session: next, changed: true, message: 'Audit complete. The relay is waiting for your final choice.' }
}

export interface ModelResult {
  accepted: boolean
  session: Session
  text: string
  errors: string[]
}

export function applyModelProposal(session: Session, characterId: CharacterId, rawProposal: unknown): ModelResult {
  const parsed = ModelProposalSchema.safeParse(rawProposal)
  if (!parsed.success) return { accepted: false, session, text: '', errors: ['model response failed the structured response schema'] }
  const character = findCharacter(characterId)
  if (!character) return { accepted: false, session, text: '', errors: ['unknown character'] }
  const proposal = parsed.data
  const accessible = character.disclosures.filter(disclosure => requirementsMet(session, disclosure.requires))
  const allowedClaims = new Set([...session.discoveredClues, ...accessible.flatMap(disclosure => disclosure.reveals ? [disclosure.reveals] : [])])
  const errors: string[] = []
  for (const claim of proposal.claims) {
    if (!findClue(claim)) errors.push(`unknown clue claim: ${claim}`)
    else if (!allowedClaims.has(claim)) errors.push(`forbidden clue claim: ${claim}`)
  }
  const rewardedClues = new Set<string>()
  for (const action of proposal.actions) {
    const disclosure = accessible.find(item => item.id === action.disclosureId)
    if (!findClue(action.clueId)) errors.push(`unknown clue action: ${action.clueId}`)
    if (!disclosure || disclosure.reveals !== action.clueId) errors.push(`unauthorized clue action: ${action.clueId}`)
    if (has(session, action.clueId) || rewardedClues.has(action.clueId)) errors.push(`duplicate clue reward: ${action.clueId}`)
    rewardedClues.add(action.clueId)
  }
  if (errors.length > 0) return { accepted: false, session, text: '', errors }
  const next = clone(session)
  for (const action of proposal.actions) grantClue(next, action.clueId, `model:${characterId}:${action.disclosureId}`)
  return { accepted: true, session: next, text: proposal.text, errors: [] }
}

export function requestHint(session: Session): Transition<string> {
  const hint = CANON.hints[session.hintsUsed]
  if (!hint) return { session, changed: false, message: 'No further hint is available.', value: '' }
  if (!requirementsMet(session, hint.requires)) return { session, changed: false, message: 'The next hint unlocks after another discovery.', value: '' }
  const next = clone(session)
  next.hintsUsed += 1
  appendEvent(next, 'hint-used', hint.id, `hint:${hint.id}`)
  return { session: next, changed: true, message: `Hint: ${hint.label}`, value: hint.text }
}

export function chooseEnding(session: Session, endingId: EndingId): Transition<string> {
  const ending = findEnding(endingId)
  if (!ending) return { session, changed: false, message: 'That ending does not exist.' }
  if (!requirementsMet(session, ending.requires)) return { session, changed: false, message: 'The evidence chain is not complete for that ending.' }
  if (session.ending) return { session, changed: false, message: 'This session already has an ending.', value: session.ending }
  const next = clone(session)
  next.ending = endingId
  next.phase = 'complete'
  appendEvent(next, 'ending-reached', endingId, `ending:${endingId}`)
  return { session: next, changed: true, message: ending.title, value: ending.text }
}

function validateSessionReferences(session: Session) {
  const errors: string[] = []
  const documents = new Set(CORPUS.documents.map(document => document.id))
  const clues = new Set(CANON.clues.map(clue => clue.id))
  if (!documents.has(session.activeDocument)) errors.push('active document is unknown')
  if (session.tabs.some(tab => !documents.has(tab)) || session.history.some(tab => !documents.has(tab)) || session.visitedDocuments.some(tab => !documents.has(tab))) errors.push('session refers to an unknown document')
  if (session.discoveredClues.some(clue => !clues.has(clue))) errors.push('session refers to an unknown clue')
  if (new Set(session.discoveredClues).size !== session.discoveredClues.length) errors.push('session has duplicate clues')
  if (new Set(session.events.map(event => event.id)).size !== session.events.length) errors.push('session has duplicate event ids')
  if (new Set(session.evidence.map(entry => entry.id)).size !== session.evidence.length) errors.push('session has duplicate evidence ids')
  for (const entry of session.evidence) {
    const document = findDocument(entry.documentId)
    if (!document) errors.push('evidence refers to an unknown document')
    else if (!document.body.includes(entry.quote)) errors.push('evidence is not a passage from its authored source')
    if (entry.connectedClueIds.some(clue => !clues.has(clue))) errors.push('evidence refers to an unknown clue')
  }
  for (const [characterId, turns] of Object.entries(session.characterMemory)) {
    const character = findCharacter(characterId)
    if (!character) { errors.push('dialogue refers to an unknown character'); continue }
    for (const turn of turns) {
      if (turn.mode === 'live') {
        if (!/^live-\d+$/.test(turn.disclosureId)) errors.push('live dialogue has an unknown reference')
      } else if (!character.disclosures.some(disclosure => disclosure.id === turn.disclosureId)) {
        errors.push('dialogue refers to an unknown disclosure')
      }
    }
  }
  if (session.phase === 'complete' && !session.ending) errors.push('complete session must have an ending')
  if (session.ending) {
    const ending = findEnding(session.ending)
    if (!ending || !requirementsMet(session, ending.requires)) errors.push('session ending is not supported by discovered evidence')
    if (session.phase !== 'complete') errors.push('completed session must have complete phase')
  }
  return errors
}

export function writeSession(session: Session) {
  SessionSchema.parse(session)
  const errors = validateSessionReferences(session)
  if (errors.length > 0) throw new Error(errors.join('; '))
  const raw = JSON.stringify(session)
  if (raw.length > 100_000) throw new Error('session save exceeds the 100 KB limit')
  return raw
}

export function readSession(raw: string | null): Session {
  if (raw === null) return createEmptySession()
  if (raw.length > 100_000) throw new Error('session save exceeds the 100 KB limit')
  const session = SessionSchema.parse(JSON.parse(raw))
  const errors = validateSessionReferences(session)
  if (errors.length > 0) throw new Error(errors.join('; '))
  return session
}

export function revealAuthorSolution() {
  return CANON.endings.map(ending => ({ id: ending.id, title: ending.title, requirements: ending.requires, text: ending.text }))
}
