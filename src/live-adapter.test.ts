import { describe, expect, it } from 'vitest'
import { buildLiveRequest, requestLiveResponse } from './live-adapter'
import { createEmptySession, openDocument, runTerminalCommand } from './engine'

function preparedSession() {
  let session = createEmptySession()
  for (const page of ['maintenance', 'news-disappearance', 'message-console']) session = openDocument(session, page).session
  return runTerminalCommand(session, 'COMPARE CLOCKS').session
}

describe('optional live character adapter', () => {
  it('sends only discovered clues permitted to the selected character', () => {
    const request = buildLiveRequest(preparedSession(), 'mara', 'What does the triangle mean?')
    expect(request.schema).toBe('phantom-web/live-character-request/v1')
    expect(request.context.knownClues.map(clue => clue.id)).toEqual(['repeat-is-local'])
    expect(JSON.stringify(request)).not.toContain('quarantine-reason')
    expect(JSON.stringify(request)).not.toContain('quiet harbor')
  })

  it('accepts a typed provider response without applying it to story state', async () => {
    const result = await requestLiveResponse({
      endpoint: '/api/character',
      session: preparedSession(),
      characterId: 'mara',
      prompt: 'What does the triangle mean?',
      fetchImpl: async () => new Response(JSON.stringify({
        schema: 'phantom-web/live-character-response/v1',
        proposal: {
          schema: 'phantom-web/model-response/v1',
          text: 'The mark belongs to a sealed page.',
          claims: ['repeat-is-local'],
          actions: [],
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } }),
    })
    expect(result.status).toBe('ok')
    expect(result.proposal?.text).toContain('sealed page')
  })

  it('refuses malformed responses and keeps cancellation and timeout retryable', async () => {
    const session = preparedSession()
    const malformed = await requestLiveResponse({
      endpoint: '/api/character', session, characterId: 'mara', prompt: 'Anything?',
      fetchImpl: async () => new Response('{"not":"a live response"}', { status: 200 }),
    })
    expect(malformed.status).toBe('invalid-response')

    const cancelledController = new AbortController()
    const pendingFetch = async (_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    })
    const cancelledPromise = requestLiveResponse({ endpoint: '/api/character', session, characterId: 'mara', prompt: 'Cancel me', signal: cancelledController.signal, fetchImpl: pendingFetch })
    cancelledController.abort()
    expect((await cancelledPromise).status).toBe('cancelled')

    const timedOut = await requestLiveResponse({ endpoint: '/api/character', session, characterId: 'mara', prompt: 'Time out', timeoutMs: 250, fetchImpl: pendingFetch })
    expect(timedOut.status).toBe('timeout')
  })

  it('reports a missing endpoint without touching the prepared session', async () => {
    const session = preparedSession()
    const result = await requestLiveResponse({ session, characterId: 'mara', prompt: 'No provider' })
    expect(result.status).toBe('unavailable')
    expect(session.discoveredClues).toEqual(['clock-0317', 'postmark-0317', 'weather-excuse', 'repeat-is-local'])
  })
})
