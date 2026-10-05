import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'

const appPort = Number(process.env.PHANTOM_APP_PORT ?? 5183)
const fixturePort = Number(process.env.PHANTOM_FIXTURE_PORT ?? 5190)
const configuredLive = process.env.PHANTOM_CONFIGURED_LIVE !== '0'
const appUrl = `http://127.0.0.1:${appPort}/${configuredLive ? '?live=1' : ''}`
const session = process.env.PLAYWRIGHT_CLI_SESSION ?? 'phantom-web-ci'
const children = []

function start(command, args, env = {}) {
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: 'inherit',
  })
  children.push(child)
  return child
}

function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['--yes', '--package', '@playwright/cli@0.1.22', 'playwright-cli', ...args], {
      env: { ...process.env, PLAYWRIGHT_CLI_SESSION: session },
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`playwright-cli ${args.join(' ')} exited with ${code}`)))
  })
}

async function waitFor(url, label) {
  const deadline = Date.now() + 60_000
  let lastError = 'not started'
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`${label} did not become ready: ${lastError}`)
}

function stopChildren() {
  for (const child of children) child.kill('SIGTERM')
}

process.once('SIGINT', () => { stopChildren(); process.exit(130) })
process.once('SIGTERM', () => { stopChildren(); process.exit(143) })

try {
  await mkdir('output/playwright', { recursive: true })
  if (configuredLive) start(process.execPath, ['scripts/headless-live-fixture.mjs'], { PHANTOM_FIXTURE_PORT: String(fixturePort) })
  start('npm', ['run', 'dev', '--', '--port', String(appPort)], {
    ...(configuredLive ? { VITE_PHANTOM_LIVE_ENDPOINT: `http://127.0.0.1:${fixturePort}/api/character` } : { VITE_PHANTOM_LIVE_ENDPOINT: '' }),
  })
  if (configuredLive) await waitFor(`http://127.0.0.1:${fixturePort}/health`, 'live fixture')
  await waitFor(`http://127.0.0.1:${appPort}/`, 'Vite app')
  await runCli(['open', appUrl])
  await runCli(['run-code', '--filename', 'scripts/headless-acceptance.js'])
} finally {
  try { await runCli(['close']) } catch { /* The browser may already be closed after a failed gate. */ }
  stopChildren()
}
