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
export type EventType = 'document-opened' | 'clue-discovered' | 'dialogue' | 'model-action' | 'terminal-command' | 'hint-used' | 'ending-reached'

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
  mode: 'prepared' | 'live-fixture'
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
  prompt: z.string().min(1).max(300),
  response: z.string().min(1).max(2000),
  mode: z.enum(['prepared', 'live-fixture']),
}).strict()

const eventSchema = z.object({
  id: storageId,
  type: z.enum(['document-opened', 'clue-discovered', 'dialogue', 'model-action', 'terminal-command', 'hint-used', 'ending-reached']),
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
  const actionClues = new Set<string>()
  for (const claim of proposal.claims) {
    if (!findClue(claim)) errors.push(`unknown clue claim: ${claim}`)
    else if (!allowedClaims.has(claim)) errors.push(`forbidden clue claim: ${claim}`)
  }
  for (const action of proposal.actions) {
    const disclosure = accessible.find(item => item.id === action.disclosureId)
    const clue = findClue(action.clueId)
    if (!clue) errors.push(`unknown clue action: ${action.clueId}`)
    if (!disclosure || disclosure.reveals !== action.clueId) errors.push(`unauthorized clue action: ${action.clueId}`)
    if (clue && !requirementsMet(session, clue.requires)) errors.push(`clue action prerequisites are not met: ${action.clueId}`)
    if (has(session, action.clueId)) errors.push(`duplicate clue reward: ${action.clueId}`)
    if (actionClues.has(action.clueId)) errors.push(`duplicate clue action: ${action.clueId}`)
    actionClues.add(action.clueId)
  }
  if (errors.length > 0) return { accepted: false, session, text: '', errors }
  const next = clone(session)
  for (const action of proposal.actions) {
    if (grantClue(next, action.clueId, `model:${characterId}:${action.disclosureId}`)) {
      appendEvent(next, 'model-action', `${characterId}:${action.disclosureId}:${action.clueId}`, `model:${characterId}:${action.disclosureId}:${action.clueId}`)
    }
  }
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

interface ClueAward {
  clueId: string
  source: string
  actionIndex: number
  clueBeforeAction: boolean
}

interface ClueEventRecord {
  clueId: string
  source: string
  eventIndex: number
}

function parseClueEvent(detail: string) {
  const match = detail.match(/^([a-z][a-z0-9:-]{0,79}) via (.+)$/)
  return match ? { clueId: match[1], source: match[2] } : null
}

function validateSessionProvenance(session: Session) {
  const errors: string[] = []
  const replay = createEmptySession()
  const visitedDocuments = new Set<string>()
  const dialogueKeys = new Set<string>()
  const terminalCommands = new Set<string>()
  const awards: ClueAward[] = []
  const clueEvents: ClueEventRecord[] = []

  const recordAward = (clueId: string, source: string, actionIndex: number, clueBeforeAction: boolean) => {
    if (has(replay, clueId)) return
    replay.discoveredClues.push(clueId)
    awards.push({ clueId, source, actionIndex, clueBeforeAction })
  }

  for (const [eventIndex, event] of session.events.entries()) {
    switch (event.type) {
      case 'document-opened': {
        const document = findDocument(event.detail)
        if (event.id !== `document:${event.detail}`) errors.push(`document event has an invalid id: ${event.id}`)
        if (!document) {
          errors.push(`document event refers to an unknown document: ${event.detail}`)
          break
        }
        if (visitedDocuments.has(document.id)) {
          errors.push(`document was opened more than once: ${document.id}`)
          break
        }
        if (!requirementsMet(replay, document.requiresClues)) {
          errors.push(`document was opened before its clues were discovered: ${document.id}`)
          break
        }
        visitedDocuments.add(document.id)
        for (const clueId of document.revealsClues) recordAward(clueId, `document:${document.id}`, eventIndex, false)
        break
      }
      case 'dialogue': {
        const separator = event.detail.indexOf(':')
        const characterId = separator < 0 ? '' : event.detail.slice(0, separator)
        const disclosureId = separator < 0 ? '' : event.detail.slice(separator + 1)
        const character = findCharacter(characterId)
        const disclosure = character?.disclosures.find(item => item.id === disclosureId)
        const key = `${characterId}:${disclosureId}`
        if (event.id !== `dialogue:${event.detail}`) errors.push(`dialogue event has an invalid id: ${event.id}`)
        if (!character || !disclosure) {
          errors.push(`dialogue event refers to an unknown disclosure: ${event.detail}`)
          break
        }
        if (dialogueKeys.has(key)) {
          errors.push(`dialogue disclosure was repeated: ${event.detail}`)
          break
        }
        if (!requirementsMet(replay, disclosure.requires)) {
          errors.push(`dialogue disclosure was used before its clues were discovered: ${event.detail}`)
          break
        }
        dialogueKeys.add(key)
        if (disclosure.reveals) recordAward(disclosure.reveals, `character:${characterId}`, eventIndex, false)
        break
      }
      case 'model-action': {
        const parts = event.detail.split(':')
        const characterId = parts[0] ?? ''
        const disclosureId = parts[1] ?? ''
        const clueId = parts[2] ?? ''
        const character = findCharacter(characterId)
        const disclosure = character?.disclosures.find(item => item.id === disclosureId)
        const source = `model:${characterId}:${disclosureId}`
        const stableId = `model:${characterId}:${disclosureId}:${clueId}`
        if (parts.length !== 3 || event.id !== stableId) errors.push(`model action event has an invalid detail or id: ${event.detail}`)
        if (!character || !disclosure || disclosure.reveals !== clueId) {
          errors.push(`model action event is not authorized: ${event.detail}`)
          break
        }
        if (!requirementsMet(replay, disclosure.requires)) {
          errors.push(`model action event was used before its disclosure clues: ${event.detail}`)
          break
        }
        recordAward(clueId, source, eventIndex, true)
        break
      }
      case 'terminal-command': {
        const command = event.detail
        const stableId = command === 'COMPARE CLOCKS'
          ? 'terminal:compare-clocks'
          : command === 'AUDIT PACKET'
            ? 'terminal:audit-packet'
            : ''
        if (!stableId || event.id !== stableId) errors.push(`terminal event has an invalid command or id: ${command}`)
        if (terminalCommands.has(command)) {
          errors.push(`terminal command was repeated: ${command}`)
          break
        }
        if (command === 'COMPARE CLOCKS') {
          if (!requirementsMet(replay, ['clock-0317', 'postmark-0317'])) errors.push('clock comparison ran before both timestamp clues')
          else recordAward('repeat-is-local', 'terminal:compare-clocks', eventIndex, true)
        } else if (command === 'AUDIT PACKET') {
          if (!requirementsMet(replay, ['crew-survived', 'quarantine-reason']) || (!has(replay, 'reporter-confirmation') && !has(replay, 'archivist-request'))) {
            errors.push('packet audit ran before its departure and witness clues')
          } else {
            recordAward('decision-ready', 'terminal:audit-packet', eventIndex, true)
          }
        }
        terminalCommands.add(command)
        break
      }
      case 'hint-used': {
        const hint = CANON.hints[replay.hintsUsed]
        if (event.id !== `hint:${event.detail}`) errors.push(`hint event has an invalid id: ${event.id}`)
        if (!hint || hint.id !== event.detail) errors.push(`hint event is out of sequence: ${event.detail}`)
        else if (!requirementsMet(replay, hint.requires)) errors.push(`hint was used before its clues were discovered: ${event.detail}`)
        else replay.hintsUsed += 1
        break
      }
      case 'ending-reached': {
        const ending = findEnding(event.detail as EndingId)
        if (event.id !== `ending:${event.detail}`) errors.push(`ending event has an invalid id: ${event.id}`)
        if (!ending || replay.ending) errors.push(`ending event is unknown or repeated: ${event.detail}`)
        else if (!requirementsMet(replay, ending.requires)) errors.push(`ending was reached before its clues were discovered: ${event.detail}`)
        else replay.ending = ending.id
        break
      }
      case 'clue-discovered': {
        const parsed = parseClueEvent(event.detail)
        if (!parsed) {
          errors.push(`clue event has invalid detail: ${event.detail}`)
          break
        }
        if (event.id !== `clue:${parsed.clueId}`) errors.push(`clue event has an invalid id: ${event.id}`)
        if (!findClue(parsed.clueId)) {
          errors.push(`clue event refers to an unknown clue: ${parsed.clueId}`)
          break
        }
        clueEvents.push({ ...parsed, eventIndex })
        break
      }
    }
  }

  const expectedClues = awards.map(award => award.clueId)
  if (JSON.stringify(expectedClues) !== JSON.stringify(session.discoveredClues)) errors.push('discovered clues do not match their authored event provenance')
  if (session.hintsUsed !== replay.hintsUsed) errors.push('hint count does not match hint events')
  if (session.ending !== replay.ending) errors.push('ending does not match ending events')

  const awardsByClue = new Map(awards.map(award => [award.clueId, award]))
  for (const clueEvent of clueEvents) {
    const award = awardsByClue.get(clueEvent.clueId)
    if (!award) {
      errors.push(`clue event has no authorized source: ${clueEvent.clueId}`)
      continue
    }
    if (award.source !== clueEvent.source) errors.push(`clue event source does not match the authorized source: ${clueEvent.clueId}`)
    if (award.clueBeforeAction ? clueEvent.eventIndex >= award.actionIndex : clueEvent.eventIndex <= award.actionIndex) {
      errors.push(`clue event has an invalid action order: ${clueEvent.clueId}`)
    }
  }
  if (clueEvents.length !== awards.length) errors.push('discovered clues and clue events are out of sync')
  return errors
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
  for (const entry of session.evidence) {
    if (!documents.has(entry.documentId)) errors.push('evidence refers to an unknown document')
    if (entry.connectedClueIds.some(clue => !clues.has(clue))) errors.push('evidence refers to an unknown clue')
  }
  if (session.phase === 'complete' && !session.ending) errors.push('completed session must have an ending')
  if (session.ending) {
    const ending = findEnding(session.ending)
    if (!ending || !requirementsMet(session, ending.requires)) errors.push('session ending is not supported by discovered evidence')
    if (session.phase !== 'complete') errors.push('completed session must have complete phase')
  }
  errors.push(...validateSessionProvenance(session))
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
  const session = SessionSchema.parse(JSON.parse(raw))
  const errors = validateSessionReferences(session)
  if (errors.length > 0) throw new Error(errors.join('; '))
  return session
}

export function revealAuthorSolution() {
  return CANON.endings.map(ending => ({ id: ending.id, title: ending.title, requirements: ending.requires, text: ending.text }))
}
