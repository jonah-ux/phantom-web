import { readFile } from 'node:fs/promises'

const html = await readFile('dist/index.html', 'utf8')
const expectedBase = '/phantom-web/'

if (!html.includes(`${expectedBase}assets/`)) {
  throw new Error(`Pages build is missing the ${expectedBase} asset prefix`)
}

if (html.includes('src="/assets/') || html.includes('href="/assets/')) {
  throw new Error('Pages build contains an absolute-root asset reference')
}

console.log(`Pages build asset prefix OK: ${expectedBase}`)
