import source from './corpus.json'
import { CorpusSchema } from './domain'
import type { Corpus } from './domain'

export const STORY_ID = 'astra-relay'
export const CANON_VERSION = '2026-10-03'
export const CORPUS: Corpus = CorpusSchema.parse(source)

export type ClueKind = 'observation' | 'comparison' | 'dialogue' | 'terminal'
export type CharacterId = 'mara' | 'ilya' | 'noor'
export type EndingId = 'expose' | 'protect'

export interface CanonFact {
  id: string
  truth: string
  visibility: 'public' | 'discovered'
}

export interface ChronologyEntry {
  id: string
  order: number
  date: string
  summary: string
  facts: string[]
}

export interface Clue {
  id: string
  title: string
  text: string
  kind: ClueKind
  sources: string[]
  requires: string[]
  redHerring?: boolean
}

export interface Disclosure {
  id: string
  label: string
  prompt: string
  response: string
  requires: string[]
  reveals?: string
}

export interface Character {
  id: CharacterId
  name: string
  role: string
  motive: string
  voice: string
  knowledge: string[]
  disclosures: Disclosure[]
}

export interface Hint {
  id: string
  label: string
  requires: string[]
  text: string
}

export interface Ending {
  id: EndingId
  title: string
  decision: string
  requires: string[]
  text: string
}

export interface Canon {
  schema: 'phantom-web/canon/v1'
  storyId: typeof STORY_ID
  version: typeof CANON_VERSION
  facts: CanonFact[]
  chronology: ChronologyEntry[]
  clues: Clue[]
  characters: Character[]
  hints: Hint[]
  endings: Ending[]
}

export const CANON: Canon = {
  schema: 'phantom-web/canon/v1',
  storyId: STORY_ID,
  version: CANON_VERSION,
  facts: [
    { id: 'station-opened', truth: 'Astra Relay opened in 1989 as a repeating-signal research station.', visibility: 'public' },
    { id: 'contact-ended', truth: 'The last official transmission ended in 1997.', visibility: 'public' },
    { id: 'signal-repeated', truth: 'A 03:17 pulse appears in more than one station record.', visibility: 'public' },
    { id: 'crew-listed', truth: 'The public roster lists Mara, Ilya, and Noor.', visibility: 'public' },
    { id: 'archive-updated', truth: 'The fictional archive is receiving new pages in the present.', visibility: 'public' },
    { id: 'hidden-harbor', truth: 'The crew moved through a private harbor rather than disappearing in a storm.', visibility: 'discovered' },
    { id: 'evacuation-signed', truth: 'The night rotation signed a departure packet and requested privacy.', visibility: 'discovered' },
    { id: 'relay-choice', truth: 'The next witness may wake the relay or keep the harbor sealed.', visibility: 'discovered' },
  ],
  chronology: [
    { id: 'opened', order: 1, date: '1989-04-11', summary: 'Astra Relay opens for repeating-signal research.', facts: ['station-opened'] },
    { id: 'contact', order: 2, date: '1997-08-21', summary: 'The station records its final public contact.', facts: ['contact-ended', 'signal-repeated'] },
    { id: 'departure', order: 3, date: '1997-08-22', summary: 'The night rotation leaves a signed packet and moves through the quiet harbor.', facts: ['hidden-harbor', 'evacuation-signed'] },
    { id: 'clipping', order: 4, date: '1998-02-04', summary: 'A public clipping repeats the weather explanation with a false date.', facts: ['archive-updated'] },
    { id: 'heartbeat', order: 5, date: '2026-10-03', summary: 'The archive begins updating at 03:17 for a new witness.', facts: ['archive-updated', 'relay-choice'] },
  ],
  clues: [
    { id: 'shift-roster-gap', title: 'The fourth voice', text: 'The roster lists three names, while the handwritten margin mentions four voices on the wire.', kind: 'observation', sources: ['directory'], requires: [] },
    { id: 'clock-0317', title: 'The slow receiver clock', text: 'The receiver logged a blue-channel pulse at 03:17 and carried a seven-minute drift.', kind: 'observation', sources: ['maintenance'], requires: [] },
    { id: 'postmark-0317', title: 'The impossible postmark', text: 'The 1998 news clipping carries a 1997 postmark and a correction made at 03:17.', kind: 'observation', sources: ['news-disappearance'], requires: [] },
    { id: 'weather-excuse', title: 'The weather excuse', text: 'The public storm explanation has no matching entry in the station weather ledger.', kind: 'observation', sources: ['news-disappearance'], requires: [], redHerring: true },
    { id: 'repeat-is-local', title: 'The pulse was outbound', text: 'Comparing the two clocks shows that the repeating 03:17 pulse was a local outbound heartbeat, not an incoming distress call.', kind: 'comparison', sources: ['message-console'], requires: ['clock-0317', 'postmark-0317'] },
    { id: 'archivist-redaction-key', title: 'The triangle key', text: 'Mara’s margin triangle identifies pages from the sealed departure packet.', kind: 'dialogue', sources: ['mara'], requires: ['repeat-is-local'] },
    { id: 'maintenance-signature', title: 'The maintenance signature', text: 'Ilya confirms that the blue channel was reserved for a quiet crew departure, never for weather.', kind: 'dialogue', sources: ['ilya'], requires: ['repeat-is-local'] },
    { id: 'quarantine-reason', title: 'Why the relay stayed dark', text: 'The crew kept the relay dark because the harbor was safe only while its coordinates stayed outside the public index.', kind: 'dialogue', sources: ['ilya'], requires: ['maintenance-signature', 'shift-roster-gap'] },
    { id: 'crew-survived', title: 'The crew survived', text: 'The signed departure packet states that the crew moved through the quiet harbor instead of dying in a storm.', kind: 'observation', sources: ['correspondence'], requires: ['archivist-redaction-key'] },
    { id: 'reporter-confirmation', title: 'A second witness', text: 'Noor confirms the crew survived and refuses to publish the harbor without a second informed witness.', kind: 'dialogue', sources: ['noor'], requires: ['crew-survived', 'quarantine-reason'] },
    { id: 'archivist-request', title: 'The privacy request', text: 'Mara asks the next witness to keep the harbor sealed if the evidence is sufficient.', kind: 'dialogue', sources: ['mara'], requires: ['crew-survived'] },
    { id: 'decision-ready', title: 'The packet is complete', text: 'The terminal accepts a final choice once the departure, its reason, and the witness path are all recorded.', kind: 'terminal', sources: ['message-console'], requires: ['crew-survived', 'quarantine-reason'] },
  ],
  characters: [
    {
      id: 'mara',
      name: 'Mara Vale',
      role: 'archive editor and keeper of names',
      motive: 'Protect the people who left while keeping their evidence legible.',
      voice: 'Careful, elliptical, and precise about what a document can prove.',
      knowledge: ['repeat-is-local', 'archivist-redaction-key', 'crew-survived', 'archivist-request'],
      disclosures: [
        { id: 'mara-margin', label: 'Ask about the triangle', prompt: 'Why do some pages carry a small triangle?', response: 'The triangle is my old index mark for a sealed departure page. It tells you where the public story stops and the packet begins.', requires: ['repeat-is-local'], reveals: 'archivist-redaction-key' },
        { id: 'mara-privacy', label: 'Ask about the harbor', prompt: 'What should happen to the harbor now?', response: 'If you have read the packet, you know why I kept the names out. You can wake the relay, but you can also choose to keep the harbor private.', requires: ['crew-survived'], reveals: 'archivist-request' },
      ],
    },
    {
      id: 'ilya',
      name: 'Ilya Sen',
      role: 'receiver engineer and night-rotation signer',
      motive: 'Keep a safe route safe, even if the public story calls it a failure.',
      voice: 'Technical, guilty, and unwilling to use a conclusion before checking the signal path.',
      knowledge: ['repeat-is-local', 'maintenance-signature', 'quarantine-reason'],
      disclosures: [
        { id: 'ilya-signature', label: 'Ask about the blue channel', prompt: 'Was blue really weather interference?', response: 'No. Blue was the handshake we kept open when the crew needed a quiet route out. I wrote the signature twice because I expected the index to call it a fault.', requires: ['repeat-is-local'], reveals: 'maintenance-signature' },
        { id: 'ilya-quarantine', label: 'Ask why it stayed dark', prompt: 'Why did the relay remain offline?', response: 'The harbor was safe only while its coordinates stayed out of the public index. Darkness was the lock on the door.', requires: ['maintenance-signature', 'shift-roster-gap'], reveals: 'quarantine-reason' },
      ],
    },
    {
      id: 'noor',
      name: 'Noor Calder',
      role: 'field reporter and second witness',
      motive: 'Publish accountable evidence without exposing people who asked for quiet.',
      voice: 'Direct, skeptical, and generous with corroboration once the chain is complete.',
      knowledge: ['crew-survived', 'quarantine-reason', 'reporter-confirmation'],
      disclosures: [
        { id: 'noor-confirm', label: 'Ask for corroboration', prompt: 'Can you confirm the crew survived?', response: 'Yes. The packet, the maintenance signature, and the roster gap all point to a deliberate departure. I will be the second witness if you keep the chain intact.', requires: ['crew-survived', 'quarantine-reason'], reveals: 'reporter-confirmation' },
      ],
    },
  ],
  hints: [
    { id: 'hint-start', label: 'A clock is a clue', requires: [], text: 'Open the maintenance log and the news clipping. Both carry 03:17, but one clock admits it is slow.' },
    { id: 'hint-compare', label: 'Make the pages disagree', requires: ['clock-0317', 'postmark-0317'], text: 'The terminal can compare the two timestamps. A comparison rewards a different kind of evidence than simply rereading a page.' },
    { id: 'hint-people', label: 'Ask the witnesses', requires: ['repeat-is-local'], text: 'Once the pulse is shown to be outbound, ask Mara about the triangle and Ilya about the blue channel.' },
    { id: 'hint-packet', label: 'Follow the margin', requires: ['archivist-redaction-key'], text: 'The triangle opens the correspondence packet. Read it before asking Noor to corroborate the departure.' },
    { id: 'hint-choice', label: 'Choose with the chain', requires: ['decision-ready'], text: 'The packet is complete. Noor can support publication, while Mara can name the privacy request. Choose the ending that matches the witness you want to be.' },
  ],
  endings: [
    { id: 'expose', title: 'Wake the relay', decision: 'Publish the evacuation evidence', requires: ['decision-ready', 'reporter-confirmation'], text: 'You wake the relay with a public record of the evacuation. The weather story remains in the archive, but the signed packet now sits beside it. The harbor stays unnamed; the truth no longer does.' },
    { id: 'protect', title: 'Keep the harbor quiet', decision: 'Seal the departure packet', requires: ['decision-ready', 'archivist-request'], text: 'You leave the relay dark and seal the packet behind its triangle mark. The public story is incomplete, but the people who asked for quiet keep their route. The archive records your restraint as a deliberate choice.' },
  ],
}

function unique(values: string[]) {
  return new Set(values).size === values.length
}

function hasCycle(clues: Clue[]) {
  const byId = new Map(clues.map(clue => [clue.id, clue]))
  const visiting = new Set<string>()
  const visited = new Set<string>()
  function visit(id: string): boolean {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    const clue = byId.get(id)
    if (clue?.requires.some(visit)) return true
    visiting.delete(id)
    visited.add(id)
    return false
  }
  return clues.some(clue => visit(clue.id))
}

export function validateCanon(corpus: Corpus, canon: Canon = CANON): string[] {
  const errors: string[] = []
  const factIds = new Set(corpus.facts)
  const documentIds = new Set(corpus.documents.map(document => document.id))
  const clueIds = new Set(canon.clues.map(clue => clue.id))
  const characterIds = new Set<string>(canon.characters.map(character => character.id))
  if (canon.storyId !== STORY_ID) errors.push('canon story id does not match the corpus')
  if (!unique(canon.facts.map(fact => fact.id))) errors.push('canon fact ids must be unique')
  if (canon.facts.some(fact => !factIds.has(fact.id))) errors.push('canon fact is absent from the corpus fact list')
  if (canon.chronology.some(entry => entry.facts.some(fact => !factIds.has(fact)))) errors.push('chronology refers to an unknown fact')
  if (canon.chronology.some((entry, index) => entry.order !== index + 1)) errors.push('chronology order must be contiguous')
  if (!unique(canon.clues.map(clue => clue.id))) errors.push('clue ids must be unique')
  for (const clue of canon.clues) {
    if (clue.requires.some(required => !clueIds.has(required))) errors.push(`clue ${clue.id} requires an unknown clue`)
    if (clue.sources.some(sourceId => !documentIds.has(sourceId) && !characterIds.has(sourceId) && sourceId !== 'message-console')) errors.push(`clue ${clue.id} has an unknown source`)
    if (clue.kind === 'dialogue' && !clue.sources.some(sourceId => characterIds.has(sourceId as CharacterId))) errors.push(`dialogue clue ${clue.id} has no character source`)
  }
  for (const document of corpus.documents) {
    if (document.revealsClues.some(clueId => !clueIds.has(clueId))) errors.push(`document ${document.id} reveals an unknown clue`)
    if (document.revealsClues.some(clueId => !canon.clues.find(clue => clue.id === clueId)?.sources.includes(document.id))) errors.push(`document ${document.id} reveals a clue it does not source`)
  }
  for (const character of canon.characters) {
    if (character.knowledge.some(clueId => !clueIds.has(clueId))) errors.push(`character ${character.id} knows an unknown clue`)
    for (const disclosure of character.disclosures) {
      if (disclosure.requires.some(clueId => !clueIds.has(clueId))) errors.push(`disclosure ${disclosure.id} requires an unknown clue`)
      if (disclosure.reveals && !clueIds.has(disclosure.reveals)) errors.push(`disclosure ${disclosure.id} reveals an unknown clue`)
      if (disclosure.reveals && !character.knowledge.includes(disclosure.reveals)) errors.push(`character ${character.id} cannot reveal a clue outside its knowledge`)
    }
  }
  if (hasCycle(canon.clues)) errors.push('clue dependency graph contains a cycle')
  for (const hint of canon.hints) {
    if (hint.requires.some(clueId => !clueIds.has(clueId))) errors.push(`hint ${hint.id} requires an unknown clue`)
  }
  for (const ending of canon.endings) {
    if (ending.requires.some(clueId => !clueIds.has(clueId))) errors.push(`ending ${ending.id} requires an unknown clue`)
  }
  const sourceClues = new Set<string>(corpus.documents.flatMap(document => document.revealsClues))
  for (const character of canon.characters) for (const disclosure of character.disclosures) if (disclosure.reveals) sourceClues.add(disclosure.reveals)
  sourceClues.add('repeat-is-local')
  sourceClues.add('decision-ready')
  if (canon.clues.some(clue => !sourceClues.has(clue.id) && !clue.redHerring)) errors.push('required clue has no engine or authored source')
  for (const ending of canon.endings) if (ending.requires.some(clueId => !sourceClues.has(clueId))) errors.push(`ending ${ending.id} has an unreachable required clue`)
  return [...new Set(errors)]
}

export function assertCanonValid(corpus: Corpus = CORPUS, canon: Canon = CANON) {
  const errors = validateCanon(corpus, canon)
  if (errors.length > 0) throw new Error(errors.join('; '))
  return true
}

assertCanonValid()
