import { z } from 'zod'
import { CANON, CANON_VERSION, CORPUS, STORY_ID } from './canon'
import { id } from './domain'
import { ModelProposalSchema } from './engine'
import type { Session } from './engine'
import type { CharacterId, Character } from './canon'
import type { ModelProposal } from './engine'

const LiveContextSchema = z.object({
  knownClues: z.array(z.object({ id, title: z.string(), text: z.string() }).strict()).max(30),
  recentPages: z.array(id).max(8),
  dialogueMemory: z.array(z.object({ prompt: z.string(), response: z.string() }).strict()).max(6),
}).strict()

export const LiveCharacterRequestSchema = z.object({
  schema: z.literal('phantom-web/live-character-request/v1'),
  storyId: z.literal(STORY_ID),
  canonVersion: z.literal(CANON_VERSION),
  characterId: z.enum(['mara', 'ilya', 'noor']),
  prompt: z.string().min(1).max(1200),
  context: LiveContextSchema,
}).strict()

export const LiveCharacterResponseSchema = z.object({
  schema: z.literal('phantom-web/live-character-response/v1'),
  proposal: ModelProposalSchema,
}).strict()

export type LiveCharacterRequest = z.infer<typeof LiveCharacterRequestSchema>
export type LiveCharacterResponse = z.infer<typeof LiveCharacterResponseSchema>

export type LiveStatus = 'ok' | 'unavailable' | 'cancelled' | 'timeout' | 'network-error' | 'invalid-response'

export interface LiveResult {
  status: LiveStatus
  detail: string
  proposal?: ModelProposal
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function characterFor(characterId: CharacterId): Character {
  const character = CANON.characters.find(item => item.id === characterId)
  if (!character) throw new Error('unknown character')
  return character
}

export function buildLiveRequest(session: Session, characterId: CharacterId, prompt: string): LiveCharacterRequest {
  const character = characterFor(characterId)
  const knownClues = CANON.clues
    .filter(clue => session.discoveredClues.includes(clue.id) && character.knowledge.includes(clue.id))
    .map(clue => ({ id: clue.id, title: clue.title, text: clue.text }))
  const request: LiveCharacterRequest = {
    schema: 'phantom-web/live-character-request/v1',
    storyId: STORY_ID,
    canonVersion: CANON_VERSION,
    characterId,
    prompt: prompt.trim(),
    context: {
      knownClues,
      recentPages: session.history.filter(pageId => CORPUS.documents.some(document => document.id === pageId)).slice(-8),
      dialogueMemory: (session.characterMemory[characterId] ?? []).slice(-6).map(turn => ({ prompt: turn.prompt, response: turn.response })),
    },
  }
  return LiveCharacterRequestSchema.parse(request)
}

export async function requestLiveResponse(options: {
  endpoint?: string
  session: Session
  characterId: CharacterId
  prompt: string
  signal?: AbortSignal
  timeoutMs?: number
  fetchImpl?: FetchLike
}): Promise<LiveResult> {
  const endpoint = options.endpoint?.trim()
  if (!endpoint) return { status: 'unavailable', detail: 'No live adapter endpoint is configured; prepared mode remains available.' }
  const fetchImpl = options.fetchImpl ?? fetch
  const request = buildLiveRequest(options.session, options.characterId, options.prompt)
  const controller = new AbortController()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, Math.max(250, options.timeoutMs ?? 8000))
  const abortExternal = () => controller.abort()
  options.signal?.addEventListener('abort', abortExternal, { once: true })
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
    if (!response.ok) return { status: 'network-error', detail: `Live adapter returned HTTP ${response.status}.` }
    const parsed = LiveCharacterResponseSchema.safeParse(await response.json())
    if (!parsed.success) return { status: 'invalid-response', detail: 'Live adapter returned an unsupported structured response.' }
    return { status: 'ok', detail: 'Live response received; the engine still controls every action.', proposal: parsed.data.proposal }
  } catch {
    if (timedOut) return { status: 'timeout', detail: 'Live response timed out. Your investigation was not changed; retry is safe.' }
    if (options.signal?.aborted) return { status: 'cancelled', detail: 'Live request cancelled. Your investigation was not changed; retry is safe.' }
    return { status: 'network-error', detail: 'Live adapter could not be reached. Prepared mode remains available.' }
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortExternal)
  }
}
