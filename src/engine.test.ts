import { describe, expect, it } from 'vitest'
import { CANON, CORPUS, validateCanon } from './canon'
import {
  applyModelProposal,
  annotateEvidence,
  askCharacter,
  chooseEnding,
  createEmptySession,
  openDocument,
  readSession,
  runTerminalCommand,
  saveEvidence,
  writeSession,
} from './engine'

function open(session: ReturnType<typeof createEmptySession>, documentId: string) {
  return openDocument(session, documentId).session
}

function prepareBase(order: 'chronological' | 'reverse') {
  let session = createEmptySession()
  const pages = order === 'chronological'
    ? ['welcome', 'directory', 'maintenance', 'news-disappearance', 'forum-signal', 'message-console']
    : ['welcome', 'news-disappearance', 'maintenance', 'directory', 'forum-signal', 'message-console']
  for (const page of pages) session = open(session, page)
  session = runTerminalCommand(session, 'COMPARE CLOCKS').session
  return session
}

function completeCommon(session: ReturnType<typeof createEmptySession>) {
  session = askCharacter(session, 'mara', 'mara-margin').session
  session = open(session, 'correspondence')
  session = askCharacter(session, 'ilya', 'ilya-signature').session
  session = askCharacter(session, 'ilya', 'ilya-quarantine').session
  return session
}

describe('Astra Relay canon and clue graph', () => {
  it('validates every authored reference and ending dependency', () => {
    expect(validateCanon(CORPUS, CANON)).toEqual([])
  })

  it('rejects an accidental unknown prerequisite', () => {
    const broken = { ...CANON, clues: [...CANON.clues, { ...CANON.clues[0], id: 'broken-clue', requires: ['missing-clue'] }] }
    expect(validateCanon(CORPUS, broken)).toContain('clue broken-clue requires an unknown clue')
  })
})

describe('engine-owned prepared mystery routes', () => {
  it('reaches the publish ending through the authored clue chain', () => {
    let session = completeCommon(prepareBase('chronological'))
    session = askCharacter(session, 'noor', 'noor-confirm').session
    session = runTerminalCommand(session, 'AUDIT PACKET').session
    const ending = chooseEnding(session, 'expose')
    expect(ending.changed).toBe(true)
    expect(ending.session.ending).toBe('expose')
    expect(ending.session.phase).toBe('complete')
    expect(ending.session.discoveredClues).toEqual(expect.arrayContaining([
      'clock-0317', 'postmark-0317', 'repeat-is-local', 'archivist-redaction-key',
      'maintenance-signature', 'quarantine-reason', 'crew-survived', 'reporter-confirmation', 'decision-ready',
    ]))
    expect(() => writeSession(ending.session)).not.toThrow()
  })

  it('reaches the protect ending through a different order', () => {
    let session = completeCommon(prepareBase('reverse'))
    session = askCharacter(session, 'mara', 'mara-privacy').session
    session = runTerminalCommand(session, 'AUDIT PACKET').session
    const ending = chooseEnding(session, 'protect')
    expect(ending.changed).toBe(true)
    expect(ending.session.ending).toBe('protect')
    expect(ending.session.discoveredClues).toEqual(expect.arrayContaining([
      'clock-0317', 'postmark-0317', 'repeat-is-local', 'archivist-redaction-key',
      'maintenance-signature', 'quarantine-reason', 'crew-survived', 'archivist-request', 'decision-ready',
    ]))
    expect(() => writeSession(ending.session)).not.toThrow()
  })

  it('keeps the common evidence chain stable across two investigation orders', () => {
    const first = completeCommon(prepareBase('chronological'))
    const second = completeCommon(prepareBase('reverse'))
    const common = ['clock-0317', 'postmark-0317', 'repeat-is-local', 'archivist-redaction-key', 'maintenance-signature', 'quarantine-reason', 'crew-survived']
    expect(first.discoveredClues.filter(clue => common.includes(clue)).sort()).toEqual(common.sort())
    expect(second.discoveredClues.filter(clue => common.includes(clue)).sort()).toEqual(common.sort())
  })

  it('does not duplicate rewards when a page or terminal command is retried', () => {
    const prepared = prepareBase('chronological')
    const reopened = openDocument(prepared, 'maintenance')
    expect(reopened.changed).toBe(false)
    expect(reopened.session.events).toEqual(prepared.events)
    const retried = runTerminalCommand(prepared, 'COMPARE CLOCKS')
    expect(retried.changed).toBe(false)
    expect(retried.session.discoveredClues).toEqual(prepared.discoveredClues)
    expect(retried.session.events).toEqual(prepared.events)
  })
})

describe('prepared character and session safety boundaries', () => {
  it('accepts one permitted model clue and rejects forbidden or fabricated actions atomically', () => {
    const base = prepareBase('chronological')
    const valid = applyModelProposal(base, 'ilya', {
      schema: 'phantom-web/model-response/v1',
      text: 'The blue channel was a departure handshake.',
      claims: ['maintenance-signature'],
      actions: [{ type: 'grant-clue', clueId: 'maintenance-signature', disclosureId: 'ilya-signature' }],
    })
    expect(valid.accepted).toBe(true)
    expect(valid.session.discoveredClues).toContain('maintenance-signature')

    const beforeForbidden = JSON.stringify(base)
    const forbidden = applyModelProposal(base, 'mara', {
      schema: 'phantom-web/model-response/v1',
      text: 'I know the quarantine reason.',
      claims: ['quarantine-reason'],
      actions: [{ type: 'grant-clue', clueId: 'quarantine-reason', disclosureId: 'mara-margin' }],
    })
    expect(forbidden.accepted).toBe(false)
    expect(JSON.stringify(forbidden.session)).toBe(beforeForbidden)

    const fabricated = applyModelProposal(base, 'ilya', {
      schema: 'phantom-web/model-response/v1',
      text: 'A fabricated clue.',
      claims: ['ghost-clue'],
      actions: [{ type: 'grant-clue', clueId: 'ghost-clue', disclosureId: 'ilya-signature' }],
    })
    expect(fabricated.accepted).toBe(false)
    expect(JSON.stringify(fabricated.session)).toBe(beforeForbidden)

    const directEnding = applyModelProposal(base, 'ilya', {
      schema: 'phantom-web/model-response/v1',
      text: 'I choose the ending.',
      claims: [],
      actions: [{ type: 'set-ending', endingId: 'expose' }],
    })
    expect(directEnding.accepted).toBe(false)
    expect(JSON.stringify(directEnding.session)).toBe(beforeForbidden)

    const duplicate = applyModelProposal(valid.session, 'ilya', {
      schema: 'phantom-web/model-response/v1',
      text: 'Again.',
      claims: ['maintenance-signature'],
      actions: [{ type: 'grant-clue', clueId: 'maintenance-signature', disclosureId: 'ilya-signature' }],
    })
    expect(duplicate.accepted).toBe(false)
    expect(JSON.stringify(duplicate.session)).toBe(JSON.stringify(valid.session))
  })

  it('round-trips evidence, notes, character memory, and rejects malformed saves', () => {
    let session = completeCommon(prepareBase('chronological'))
    session = askCharacter(session, 'ilya', 'ilya-quarantine').session
    const saved = saveEvidence(session, 'maintenance', '03:17 — blue channel pulsed twice. No incoming carrier.')
    expect(saved.changed).toBe(true)
    session = annotateEvidence(saved.session, saved.value!.id, 'The absence of an incoming carrier matters.', true).session
    const raw = writeSession(session)
    expect(readSession(raw)).toEqual(session)
    expect(() => readSession('{')).toThrow()
    expect(() => readSession(JSON.stringify({ ...session, canonVersion: 'old-story' }))).toThrow()
    expect(() => readSession(JSON.stringify({ ...session, discoveredClues: ['missing-clue'] }))).toThrow()
  })
})
