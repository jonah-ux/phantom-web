import { z } from 'zod'

export const id = z.string().regex(/^[a-z][a-z0-9-]{0,47}$/)

const documentStyle = z.enum([
  'home',
  'directory',
  'technical-log',
  'forum',
  'newspaper',
  'personal',
  'terminal',
  'correspondence',
  'archive',
])

export const CorpusSchema = z.object({
  schema: z.literal('phantom-web/corpus/v2'),
  facts: z.array(id).min(1).max(100),
  documents: z.array(z.object({
    id,
    title: z.string().min(1).max(160),
    address: z.string().regex(/^astra\.invalid\/[a-z0-9/-]+$/),
    body: z.string().min(1).max(8000),
    style: documentStyle,
    timestamp: z.string().min(1).max(80),
    facts: z.array(id).max(30),
    links: z.array(id).max(20),
    requiresClues: z.array(id).max(20),
    revealsClues: z.array(id).max(20),
  }).strict()).min(1).max(30),
}).strict().superRefine((corpus, context) => {
  if (new Set(corpus.documents.map(document => document.id)).size !== corpus.documents.length) context.addIssue({ code: 'custom', message: 'document ids must be unique' })
  if (new Set(corpus.facts).size !== corpus.facts.length) context.addIssue({ code: 'custom', message: 'fact ids must be unique' })
  const documentIds = new Set(corpus.documents.map(document => document.id))
  for (const document of corpus.documents) {
    if (document.facts.some(fact => !corpus.facts.includes(fact))) context.addIssue({ code: 'custom', message: 'unknown canon fact' })
    if (document.links.some(link => !documentIds.has(link))) context.addIssue({ code: 'custom', message: `unknown document link: ${document.id}` })
  }
})

export type Corpus = z.infer<typeof CorpusSchema>

export function searchCorpus(corpus: Corpus, query: string) {
  const term = query.trim().toLowerCase()
  return corpus.documents.filter(document => `${document.title} ${document.body}`.toLowerCase().includes(term))
}

const NotebookSchema = z.object({ schema: z.literal('phantom-web/notebook/v1'), documents: z.array(id).max(30) }).strict()

export function readNotebook(raw: string | null, corpus: Corpus): string[] {
  if (raw === null) return []
  const notebook = NotebookSchema.parse(JSON.parse(raw))
  const known = new Set(corpus.documents.map(document => document.id))
  if (notebook.documents.some(document => !known.has(document))) throw new Error('notebook refers to an unknown document')
  if (new Set(notebook.documents).size !== notebook.documents.length) throw new Error('duplicate notebook entry')
  return notebook.documents
}

export function writeNotebook(documents: string[], corpus: Corpus): string {
  const raw = JSON.stringify({ schema: 'phantom-web/notebook/v1', documents })
  readNotebook(raw, corpus)
  return raw
}
