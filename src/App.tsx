import { useState } from 'react'
import source from './corpus.json'
import { CorpusSchema, readNotebook, searchCorpus, writeNotebook } from './domain'
import './App.css'

const corpus = CorpusSchema.parse(source)
const storageKey = 'phantom-web:notebook:v1'

function restore() {
  try { return { entries: readNotebook(localStorage.getItem(storageKey), corpus), message: '' } }
  catch { return { entries: [], message: 'The saved notebook could not be read. No imported progress was applied.' } }
}

export default function App() {
  const [initial] = useState(restore)
  const [entries, setEntries] = useState(initial.entries)
  const [message, setMessage] = useState(initial.message)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('welcome')
  const document = corpus.documents.find(page => page.id === selected)!
  const results = searchCorpus(corpus, query)
  function save() {
    if (entries.includes(selected)) return
    const next = [...entries, selected]
    try {
      localStorage.setItem(storageKey, writeNotebook(next, corpus))
      setEntries(next)
      setMessage('Source saved to your local notebook.')
    } catch { setMessage('Local storage is unavailable. Your notebook was not changed.') }
  }
  function reset() {
    try { localStorage.removeItem(storageKey); setEntries([]); setMessage('Notebook cleared.') }
    catch { setMessage('Local storage is unavailable. Your notebook was not changed.') }
  }
  return <main>
    <header><span className="eyebrow">PHANTOM WEB / FICTIONAL ARCHIVE STARTER</span><h1>The archive is awake.</h1><p>A fictional internet waiting for its first complete mystery.</p></header>
    <div className="status">Three prepared documents · AI characters and ending logic are not implemented</div>
    <div className="archive-layout">
      <nav className="panel" aria-label="Archive search"><label htmlFor="search">Search the archive</label><input id="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try 03:17" />
        <ul>{results.map(page => <li key={page.id}><button className={selected === page.id ? 'selected' : 'secondary'} onClick={() => setSelected(page.id)}>{page.title}</button></li>)}</ul>
        {results.length === 0 && <p>No matching documents.</p>}
      </nav>
      <article className="panel document"><span className="address">{document.address} · simulated address</span><h2>{document.title}</h2><p>{document.body}</p><button onClick={save} disabled={entries.includes(selected)}>{entries.includes(selected) ? 'Saved to notebook' : 'Save source to notebook'}</button><p role="status">{message}</p></article>
    </div>
    <section className="panel"><h2>Evidence notebook <span className="count">{entries.length}</span></h2><ul>{entries.map(entry => <li key={entry}><button className="secondary" onClick={() => setSelected(entry)}>{corpus.documents.find(page => page.id === entry)!.title}</button></li>)}</ul>{entries.length === 0 && <p>Save a document to keep its source across reloads.</p>}<button className="secondary" onClick={reset}>Clear notebook</button></section>
    <footer>All pages and institutions are fictional. Next: canon, clue gates, characters, hints and two endings. Read docs/BUILD-PROMPT.md.</footer>
  </main>
}
