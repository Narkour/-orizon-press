import { useState, useRef, useEffect } from 'react'
import { penNames } from '../data/catalogue'

// ─── Types ────────────────────────────────────────────────────────────────────
interface BookRow {
  id: string; slug: string; title: string; author: string
  genre: string; available: boolean; pdf_path: string
  cover_url: string; price: number; created_at: string
}

interface GeneratedMetadata {
  description: string; shortDescription: string
  bisac: string[]; seoKeywords: string[]; tagline: string
}

interface UploadResult {
  book: BookRow; metadata: GeneratedMetadata
  files: { pdf: string; epub: string }; message: string
}

type Step = 'idle' | 'processing' | 'result' | 'error'
type ProcessStage = 'extract' | 'ai' | 'pdf' | 'epub' | 'upload' | 'save' | 'done'

const STAGE_LABELS: Record<ProcessStage, string> = {
  extract: 'Extracting text from DOCX…',
  ai:      'Generating metadata with Claude…',
  pdf:     'Building PDF…',
  epub:    'Building EPUB…',
  upload:  'Uploading to Supabase Storage…',
  save:    'Saving to catalogue…',
  done:    'Complete',
}
const STAGE_ORDER: ProcessStage[] = ['extract','ai','pdf','epub','upload','save','done']

const GENRES = [
  'African History', 'African Spirituality & Consciousness',
  'Self-Help & Personal Growth', 'Science & Society',
  'Literary Fiction', 'Historical Fiction',
  'Religion & Spirituality', 'Spirituality & Consciousness',
]

// ─── Auth gate ────────────────────────────────────────────────────────────────
function AuthGate({ onAuth }: { onAuth: (key: string) => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pw.trim()) { setErr('Enter password'); return }
    onAuth(pw.trim())
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--parchment)' }}>
      <form onSubmit={submit} style={{ width: 320, padding: '2.5rem', border: '1px solid var(--border)', background: 'var(--parchment)' }}>
        <div style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--mist)', marginBottom: '1.5rem' }}>
          Orizon Press — Admin
        </div>
        <input
          type="password"
          placeholder="Admin password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          autoFocus
          style={{ width: '100%', padding: '0.7rem 1rem', border: '1px solid var(--border)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', background: 'white', boxSizing: 'border-box' }}
        />
        {err && <p style={{ color: '#c0392b', fontSize: '0.8rem', marginTop: '0.5rem' }}>{err}</p>}
        <button type="submit" className="btn btn--primary" style={{ marginTop: '1rem', width: '100%' }}>
          Sign in
        </button>
      </form>
    </div>
  )
}

// ─── Progress indicator ───────────────────────────────────────────────────────
function Progress({ stage }: { stage: ProcessStage | null }) {
  if (!stage) return null
  const idx = STAGE_ORDER.indexOf(stage)
  return (
    <div style={{ margin: '2rem 0' }}>
      {STAGE_ORDER.filter(s => s !== 'done').map((s, i) => {
        const done    = i < idx
        const current = i === idx
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0' }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              background:   done    ? 'var(--gold)' : current ? 'var(--ink)' : 'var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6rem', color: done || current ? 'var(--parchment)' : 'var(--mist)',
            }}>
              {done ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: '0.82rem', color: current ? 'var(--ink)' : done ? 'var(--mist)' : 'var(--border)' }}>
              {STAGE_LABELS[s]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Book list ────────────────────────────────────────────────────────────────
function BookList({ adminKey }: { adminKey: string }) {
  const [books, setBooks] = useState<BookRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/books', { headers: { Authorization: `Bearer ${adminKey}` } })
      .then(r => r.json())
      .then(setBooks)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [adminKey])

  if (loading) return <p style={{ color: 'var(--mist)', fontSize: '0.82rem' }}>Loading books…</p>

  return (
    <div style={{ marginTop: '3rem' }}>
      <div style={{ fontSize: '0.6rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mist)', marginBottom: '1rem' }}>
        Catalogue — {books.length} titles
      </div>
      <div style={{ border: '1px solid var(--border)' }}>
        {books.map((b, i) => (
          <div key={b.id} style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto',
            gap: '1rem', alignItems: 'center',
            padding: '0.75rem 1rem',
            borderTop: i === 0 ? 'none' : '1px solid var(--border)',
            background: 'var(--parchment)',
          }}>
            <div>
              <span style={{ fontSize: '0.88rem', fontFamily: 'var(--font-display)' }}>{b.title}</span>
              <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--mist)', marginTop: 2 }}>
                {b.author} · {b.genre}
              </span>
            </div>
            <span style={{ fontSize: '0.68rem', color: b.pdf_path ? 'var(--gold)' : 'var(--mist)' }}>
              {b.pdf_path ? 'PDF ✓' : 'No PDF'}
            </span>
            <span style={{ fontSize: '0.68rem', color: b.available ? '#2e7d32' : '#c0392b' }}>
              {b.available ? 'Live' : 'Hidden'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main admin page ──────────────────────────────────────────────────────────
export default function Admin() {
  const [adminKey, setAdminKey] = useState<string | null>(
    () => sessionStorage.getItem('adminKey')
  )
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')

  // Fields
  const [title,     setTitle]     = useState('')
  const [authorVal, setAuthorVal] = useState('')
  const [penNameId, setPenNameId] = useState('')
  const [genre,     setGenre]     = useState('')
  const [price,     setPrice]     = useState('9.99')
  const [file,      setFile]      = useState<File | null>(null)

  // Upload state
  const [step,   setStep]   = useState<Step>('idle')
  const [stage,  setStage]  = useState<ProcessStage | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [errMsg, setErrMsg] = useState('')
  const [editedMeta, setEditedMeta] = useState<GeneratedMetadata | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Verify admin password against API
  const handleAuth = async (pw: string) => {
    setAuthError('')
    const r = await fetch('/api/admin/books', {
      headers: { Authorization: `Bearer ${pw}` },
    })
    if (r.status === 401) { setAuthError('Incorrect password'); return }
    sessionStorage.setItem('adminKey', pw)
    setAdminKey(pw)
    setAuthed(true)
  }

  useEffect(() => {
    if (adminKey) handleAuth(adminKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title || !genre || !adminKey) return

    setStep('processing')
    setStage('extract')
    setErrMsg('')
    setResult(null)

    const form = new FormData()
    form.append('file',       file)
    form.append('title',      title)
    form.append('author',     authorVal)
    form.append('penNameId',  penNameId)
    form.append('genre',      genre)
    form.append('price',      price)

    // Simulate stage progression while waiting for the server
    const stages: ProcessStage[] = ['extract','ai','pdf','epub','upload','save']
    let si = 0
    const ticker = setInterval(() => {
      si = Math.min(si + 1, stages.length - 1)
      setStage(stages[si])
    }, 4000)

    try {
      const r = await fetch('/api/admin/upload-book', {
        method:  'POST',
        headers: { Authorization: `Bearer ${adminKey}` },
        body:    form,
      })
      clearInterval(ticker)
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? `Server error ${r.status}`)
      setResult(data)
      setEditedMeta(data.metadata)
      setStage('done')
      setStep('result')
    } catch (err) {
      clearInterval(ticker)
      setErrMsg(err instanceof Error ? err.message : 'Upload failed')
      setStep('error')
    }
  }

  const saveEdits = async () => {
    if (!result || !editedMeta || !adminKey) return
    setSaving(true)
    try {
      await fetch('/api/admin/books', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body:    JSON.stringify({
          slug:              result.book.slug,
          description:       editedMeta.description,
          short_description: editedMeta.shortDescription,
          tagline:           editedMeta.tagline,
        }),
      })
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setStep('idle'); setStage(null); setResult(null); setErrMsg('')
    setTitle(''); setAuthorVal(''); setPenNameId(''); setGenre('')
    setPrice('9.99'); setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (!authed) return <AuthGate onAuth={handleAuth} />
  if (authError) return <AuthGate onAuth={handleAuth} />

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border)',
    fontFamily: 'var(--font-body)', fontSize: '0.88rem', background: 'var(--parchment)',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.62rem', letterSpacing: '0.14em',
    textTransform: 'uppercase', color: 'var(--mist)', marginBottom: '0.35rem',
  }

  return (
    <div style={{ padding: '3rem 2rem 6rem', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <span className="eyebrow">Orizon Press</span>
        <h1 style={{ marginTop: '0.4rem' }}>Admin Dashboard</h1>
        <p style={{ color: 'var(--mist)', fontSize: '0.82rem' }}>
          Upload a .docx manuscript → Claude generates metadata → PDF + EPUB created → saved to catalogue.
        </p>
      </div>

      {/* ── Upload form ── */}
      {(step === 'idle' || step === 'error') && (
        <form onSubmit={handleUpload} style={{ display: 'grid', gap: '1.25rem' }}>
          {step === 'error' && (
            <div style={{ padding: '0.85rem 1rem', background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.3)', fontSize: '0.82rem', color: '#c0392b' }}>
              {errMsg}
            </div>
          )}

          <div>
            <label style={labelStyle}>Manuscript (.docx)</label>
            <input
              ref={fileRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              required
              style={{ fontSize: '0.82rem', fontFamily: 'var(--font-body)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Book title</label>
              <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} required placeholder="Full title" />
            </div>
            <div>
              <label style={labelStyle}>Price (USD)</label>
              <input style={inputStyle} type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Author name</label>
              <input style={inputStyle} value={authorVal} onChange={e => setAuthorVal(e.target.value)} required placeholder="As shown on cover" />
            </div>
            <div>
              <label style={labelStyle}>Pen name</label>
              <select style={inputStyle} value={penNameId} onChange={e => setPenNameId(e.target.value)}>
                <option value="">— none —</option>
                {penNames.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Genre</label>
            <select style={inputStyle} value={genre} onChange={e => setGenre(e.target.value)} required>
              <option value="">— select genre —</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <button type="submit" className="btn btn--primary" disabled={!file}>
            Process Book
          </button>
        </form>
      )}

      {/* ── Processing ── */}
      {step === 'processing' && (
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--mist)' }}>
            Processing "{title}"…
          </p>
          <Progress stage={stage} />
          <p style={{ fontSize: '0.75rem', color: 'var(--mist)' }}>This takes 15–30 seconds. Don't close the tab.</p>
        </div>
      )}

      {/* ── Result ── */}
      {step === 'result' && result && editedMeta && (
        <div>
          <div style={{ padding: '1rem', background: 'rgba(46,125,50,0.07)', border: '1px solid rgba(46,125,50,0.3)', marginBottom: '2rem', fontSize: '0.85rem' }}>
            ✓ {result.message} — PDF: {result.files.pdf} · EPUB: {result.files.epub}
          </div>

          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Tagline</label>
              <input
                style={inputStyle}
                value={editedMeta.tagline}
                onChange={e => setEditedMeta(m => m ? { ...m, tagline: e.target.value } : m)}
              />
            </div>
            <div>
              <label style={labelStyle}>Short description (one sentence)</label>
              <input
                style={inputStyle}
                value={editedMeta.shortDescription}
                onChange={e => setEditedMeta(m => m ? { ...m, shortDescription: e.target.value } : m)}
              />
            </div>
            <div>
              <label style={labelStyle}>Full description</label>
              <textarea
                style={{ ...inputStyle, height: 160, resize: 'vertical' }}
                value={editedMeta.description}
                onChange={e => setEditedMeta(m => m ? { ...m, description: e.target.value } : m)}
              />
            </div>
            <div>
              <label style={labelStyle}>BISAC codes</label>
              <p style={{ fontSize: '0.82rem', color: 'var(--ink)', lineHeight: 1.6 }}>
                {editedMeta.bisac.join(' · ')}
              </p>
            </div>
            <div>
              <label style={labelStyle}>SEO keywords</label>
              <p style={{ fontSize: '0.82rem', color: 'var(--ink)', lineHeight: 1.6 }}>
                {editedMeta.seoKeywords.join(', ')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
              className="btn btn--primary"
              onClick={saveEdits}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save metadata to catalogue'}
            </button>
            <button className="btn btn--outline" onClick={reset}>
              Upload another book
            </button>
          </div>
        </div>
      )}

      {/* ── Book list ── */}
      {step === 'idle' && <BookList adminKey={adminKey!} />}
    </div>
  )
}
