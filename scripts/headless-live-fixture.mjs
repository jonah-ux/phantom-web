import { createServer } from 'node:http'

const port = Number(process.env.PHANTOM_FIXTURE_PORT ?? 5190)
const allowedOrigin = `http://127.0.0.1:${process.env.PHANTOM_APP_PORT ?? 5183}`

function send(response, body, status = 200) {
  response.writeHead(status, {
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-origin': allowedOrigin,
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(body))
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('ok')
    return
  }
  if (request.method === 'OPTIONS' && request.url === '/api/character') {
    response.writeHead(204, {
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-origin': allowedOrigin,
    })
    response.end()
    return
  }
  if (request.method !== 'POST' || request.url !== '/api/character') {
    response.writeHead(404)
    response.end()
    return
  }

  let raw = ''
  for await (const chunk of request) raw += chunk
  let body
  try {
    body = JSON.parse(raw)
  } catch {
    send(response, {}, 400)
    return
  }

  if (body.prompt === 'MALFORMED') {
    send(response, { malformed: true })
    return
  }

  if (body.prompt === 'FORBIDDEN') {
    send(response, {
        schema: 'phantom-web/live-character-response/v1',
        proposal: {
          schema: 'phantom-web/model-response/v1',
          text: 'This action should be rejected by the story engine.',
          claims: [],
          actions: [{ type: 'grant-clue', disclosureId: 'mara-margin', clueId: 'crew-survived' }],
        },
      })
    return
  }

  send(response, {
      schema: 'phantom-web/live-character-response/v1',
      proposal: {
        schema: 'phantom-web/model-response/v1',
        text: 'Fixture response accepted; the engine still controls every action.',
        claims: body.context?.knownClues?.some(clue => clue.id === 'repeat-is-local') ? ['repeat-is-local'] : [],
        actions: [],
      },
  })
})

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`headless live fixture listening on http://127.0.0.1:${port}/api/character\n`)
})

function stop() {
  server.close(() => process.exit(0))
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
