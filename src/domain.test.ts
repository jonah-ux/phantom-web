import { describe, expect, it } from 'vitest'
import source from './corpus.json'
import { CorpusSchema, readNotebook, searchCorpus, writeNotebook } from './domain'

const corpus = CorpusSchema.parse(source)
describe('fictional corpus boundary', () => {
  it('searches the actual authored text case-insensitively', () => {
    expect(searchCorpus(corpus, 'postmark').map(document => document.id)).toEqual(['news-disappearance'])
    expect(searchCorpus(corpus, 'ASTRA').map(document => document.id)).toContain('welcome')
    expect(searchCorpus(corpus, 'unwritten ending')).toEqual([])
  })
  it('refuses documents referring to missing canon facts', () => {
    expect(() => CorpusSchema.parse({ ...source, documents: [{ ...source.documents[0], facts: ['unknown'] }] })).toThrow()
  })
  it('refuses links to missing fictional pages', () => {
    expect(() => CorpusSchema.parse({ ...source, documents: [{ ...source.documents[0], links: ['missing-page'] }] })).toThrow()
  })
  it('refuses duplicate document identities and real outside addresses', () => {
    expect(() => CorpusSchema.parse({ ...source, documents: [source.documents[0], source.documents[0]] })).toThrow()
    expect(() => CorpusSchema.parse({ ...source, documents: [{ ...source.documents[0], address: 'https://example.com' }] })).toThrow()
  })
  it('round-trips a sourced notebook', () => {
    expect(readNotebook(writeNotebook(['maintenance'], corpus), corpus)).toEqual(['maintenance'])
    expect(readNotebook(null, corpus)).toEqual([])
  })
  it('refuses malformed, duplicate, unknown, or incompatible notebook data', () => {
    expect(() => readNotebook('{', corpus)).toThrow()
    expect(() => writeNotebook(['welcome', 'welcome'], corpus)).toThrow()
    expect(() => writeNotebook(['missing'], corpus)).toThrow()
    expect(() => readNotebook(JSON.stringify({ schema: 'phantom-web/notebook/v2', documents: [] }), corpus)).toThrow()
  })
})
