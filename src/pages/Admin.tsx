import { useState, useRef, useEffect } from 'react'
import { penNames } from '../data/catalogue'

// ─── Types ────────────────────────────────────────────────────────────────────
interface BookRow {
  id: string; slug: string; title: string; author: string
  genre: string; available: boolean; pdf_path: string; epub_path: string | null
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
function AuthGate({ onAuth, error }: { onAuth: (key: string) => void; error?: string }) {
  const [pw, setPw] = useState('')
  const [localErr, setLocalErr] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pw.trim()) { setLocalErr('Enter password'); return }
    setLocalErr('')
    onAuth(pw.trim())
  }

  const displayErr = localErr || error

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
          onChange={e => { setPw(e.target.value); setLocalErr('') }}
          autoFocus
          style={{ width: '100%', padding: '0.7rem 1rem', border: '1px solid var(--border)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', background: 'white', boxSizing: 'border-box' }}
        />
        {displayErr && <p style={{ color: '#c0392b', fontSize: '0.8rem', marginTop: '0.5rem' }}>{displayErr}</p>}
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

// ─── Audiobook generation ─────────────────────────────────────────────────────
const VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam — deep, narrative' },
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel — clear female' },
  { id: 'ErXwobaYiN019PkySvjV', label: 'Antoni — storytelling male' },
  { id: 'XB0fDUnXU5powFXDhCwa', label: 'Charlotte — soft female' },
]
const MAX_CHARS = 5_000

function AudiobookSection({ adminKey }: { adminKey: string }) {
  const [books, setBooks] = useState<BookRow[]>([])
  const [slug, setSlug] = useState('')
  const [voiceId, setVoiceId] = useState(VOICES[0].id)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ audioPath: string; sizeMb: string } | null>(null)
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/books', { headers: { Authorization: `Bearer ${adminKey}` } })
      .then(r => r.json())
      .then(setBooks)
      .catch(() => {})
  }, [adminKey])

  const generate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug || !text) return
    setStatus('generating')
    setErrMsg('')
    setResult(null)
    try {
      const r = await fetch('/api/admin/elevenlabs-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ slug, text, voiceId }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? `Server error ${r.status}`)
      setResult(data)
      setStatus('done')
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Generation failed')
      setStatus('error')
    }
  }

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
    <div style={{ marginTop: '4rem', borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
      <div style={{ fontSize: '0.6rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mist)', marginBottom: '0.5rem' }}>
        Audiobook Generation
      </div>
      <p style={{ color: 'var(--mist)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
        Paste up to {MAX_CHARS.toLocaleString()} characters (one chapter or a sample). Powered by ElevenLabs.
      </p>

      <form onSubmit={generate} style={{ display: 'grid', gap: '1.25rem' }}>
        {status === 'error' && (
          <div style={{ padding: '0.85rem 1rem', background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.3)', fontSize: '0.82rem', color: '#c0392b' }}>
            {errMsg}
          </div>
        )}
        {status === 'done' && result && (
          <div style={{ padding: '0.85rem 1rem', background: 'rgba(46,125,50,0.07)', border: '1px solid rgba(46,125,50,0.3)', fontSize: '0.82rem' }}>
            ✓ Audio generated — {result.sizeMb} MB saved to <code>{result.audioPath}</code>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Book</label>
            <select style={inputStyle} value={slug} onChange={e => setSlug(e.target.value)} required>
              <option value="">— select book —</option>
              {books.map(b => <option key={b.slug} value={b.slug}>{b.title}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Narrator voice</label>
            <select style={inputStyle} value={voiceId} onChange={e => setVoiceId(e.target.value)}>
              {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>
            Text to narrate — {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
          </label>
          <textarea
            style={{ ...inputStyle, height: 200, resize: 'vertical', fontFamily: 'var(--font-body)' }}
            value={text}
            onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Paste chapter or sample text here…"
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn--primary"
          disabled={status === 'generating' || !slug || !text}
          style={{ maxWidth: 240 }}
        >
          {status === 'generating' ? 'Generating audio…' : 'Generate MP3'}
        </button>
      </form>
    </div>
  )
}

// ─── Distribution guides ──────────────────────────────────────────────────────
const PLATFORMS = [
  {
    name: 'Draft2Digital',
    tagline: 'Upload once → distribute to Apple Books, Kobo, B&N, Scribd, Overdrive & more',
    url: 'https://www.draft2digital.com',
    recommended: true,
    steps: [
      'Create a free account at draft2digital.com',
      'Click "Add a Book" → upload your EPUB file and cover image (2560×1600 px minimum)',
      'Fill in title, author, description, BISAC category, and price',
      'Under "Channels", select Apple Books, Kobo, B&N Press, Scribd, and any others',
      'Click Publish — Draft2Digital formats and delivers to all selected channels',
      'Royalties: 70% of list price; D2D takes a 10% commission from your share',
      'Reports and payments via D2D dashboard (monthly)',
    ],
  },
  {
    name: 'Apple Books',
    tagline: 'Direct upload via iTunes Connect (skip if using Draft2Digital)',
    url: 'https://itunesconnect.apple.com',
    steps: [
      'Enroll as an Apple Books publisher at itunesconnect.apple.com → sign in with Apple ID',
      'Download Apple\'s Transporter app (Mac/Windows) or use the web uploader',
      'Prepare: EPUB 3.0 file + cover art (1400×1400 px minimum, RGB JPEG)',
      'In Books tab → click "+" → choose "Book" → upload EPUB and cover',
      'Set territories, pricing tier (Tier 3 ≈ $3.99), and release date',
      'Submit for review — approval takes 24–72 hours',
      'Royalties: 70% worldwide',
    ],
  },
  {
    name: 'Kobo Writing Life',
    tagline: 'Free, non-exclusive, 70% royalty on $2.99–$12.99',
    url: 'https://www.kobo.com/writinglife',
    steps: [
      'Create account at kobo.com/writinglife',
      'Click "Create eBook" → upload EPUB + cover image (1600×2400 px recommended)',
      'Enter title, description, BISAC categories, language, and price',
      'Set at least USD price; Kobo auto-converts for other currencies',
      'Click "Save & Publish" — goes live within 24–72 hours',
      'Royalties: 70% for $2.99–$12.99; 45% below or above that range',
      'Payments monthly via PayPal or direct deposit (minimum $50 threshold)',
    ],
  },
  {
    name: 'Barnes & Noble Press',
    tagline: 'Direct to B&N Nook readers, 70% royalty',
    url: 'https://press.barnesandnoble.com',
    steps: [
      'Create a free B&N Press account at press.barnesandnoble.com',
      'Click "Submit a Title" → upload EPUB + cover (1400×2100 px minimum)',
      'Enter title, subtitle, contributors, description, BISAC, and ISBN (optional)',
      'Set list price — must be $2.99+ for 70% royalty (40% below that)',
      'Click Submit — B&N reviews within 24–72 hours',
      'Payments quarterly via check or direct deposit (minimum $10)',
    ],
  },
]

function DistributionGuides() {
  const [open, setOpen] = useState<string | null>(null)

  const eyebrowStyle: React.CSSProperties = {
    fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mist)',
  }

  return (
    <div style={{ marginTop: '4rem', borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
      <div style={{ ...eyebrowStyle, marginBottom: '0.5rem' }}>Distribution Guides</div>
      <p style={{ color: 'var(--mist)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
        Step-by-step instructions for publishing your EPUBs on major retail platforms.
        <strong style={{ color: 'var(--ink)' }}> Tip: start with Draft2Digital to reach all platforms in one upload.</strong>
      </p>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {PLATFORMS.map(p => (
          <div key={p.name} style={{ border: '1px solid var(--border)', background: 'var(--parchment)' }}>
            <button
              onClick={() => setOpen(o => o === p.name ? null : p.name)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.9rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', textAlign: 'left',
              }}
            >
              <span>
                <span style={{ fontSize: '0.9rem', fontFamily: 'var(--font-display)' }}>{p.name}</span>
                {p.recommended && (
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '1px 5px' }}>
                    Recommended
                  </span>
                )}
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--mist)', marginTop: 2 }}>{p.tagline}</span>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--mist)', flexShrink: 0, marginLeft: '1rem' }}>
                {open === p.name ? '▲' : '▼'}
              </span>
            </button>

            {open === p.name && (
              <div style={{ padding: '0 1rem 1rem' }}>
                <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'grid', gap: '0.6rem' }}>
                  {p.steps.map((step, i) => (
                    <li key={i} style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--ink)' }}>{step}</li>
                  ))}
                </ol>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block', marginTop: '0.85rem', fontSize: '0.75rem', color: 'var(--gold)' }}
                >
                  Open {p.name} →
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Lulu print-on-demand ─────────────────────────────────────────────────────
const SUPABASE_PUBLIC = 'https://lyupqrxstrneczdbwrog.supabase.co/storage/v1/object/public'

function LuluSection({ adminKey }: { adminKey: string }) {
  const [books, setBooks] = useState<BookRow[]>([])
  const [slug,     setSlug]     = useState('')
  const [qty,      setQty]      = useState('1')
  const [name,     setName]     = useState('')
  const [street,   setStreet]   = useState('')
  const [city,     setCity]     = useState('')
  const [state,    setState_]   = useState('')
  const [country,  setCountry]  = useState('US')
  const [postcode, setPostcode] = useState('')
  const [phone,    setPhone]    = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ luluJobId: number; status: string; dashboardUrl: string } | null>(null)
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/books', { headers: { Authorization: `Bearer ${adminKey}` } })
      .then(r => r.json()).then(setBooks).catch(() => {})
  }, [adminKey])

  const selectedBook = books.find(b => b.slug === slug)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBook) return
    setStatus('submitting'); setErrMsg(''); setResult(null)

    const interiorPdfUrl = `${SUPABASE_PUBLIC}/ebooks/${selectedBook.pdf_path}`
    const coverSourceUrl = selectedBook.cover_url || `${SUPABASE_PUBLIC}/covers/${selectedBook.slug}.png`

    try {
      const r = await fetch('/api/admin/lulu-create-pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({
          slug: selectedBook.slug, title: selectedBook.title,
          interiorPdfUrl, coverSourceUrl,
          quantity: qty,
          shippingName: name, shippingStreet: street, shippingCity: city,
          shippingState: state, shippingCountry: country,
          shippingPostcode: postcode, shippingPhone: phone,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? `Error ${r.status}`)
      setResult(data)
      setStatus('done')
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Failed')
      setStatus('error')
    }
  }

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
    <div style={{ marginTop: '4rem', borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
      <div style={{ fontSize: '0.6rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mist)', marginBottom: '0.5rem' }}>
        Print on Demand — Lulu
      </div>
      <p style={{ color: 'var(--mist)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
        Order a physical proof copy of any book via Lulu. Uses the book's existing PDF as interior.
        For a production-quality cover, upload a Lulu-spec cover PDF first. The cover image is used for proofing.
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gap: '1.25rem' }}>
        {status === 'error' && (
          <div style={{ padding: '0.85rem 1rem', background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.3)', fontSize: '0.82rem', color: '#c0392b' }}>
            {errMsg}
          </div>
        )}
        {status === 'done' && result && (
          <div style={{ padding: '0.85rem 1rem', background: 'rgba(46,125,50,0.07)', border: '1px solid rgba(46,125,50,0.3)', fontSize: '0.82rem' }}>
            ✓ Print job #{result.luluJobId} created — status: {result.status} ·{' '}
            <a href={result.dashboardUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>
              View in Lulu dashboard →
            </a>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Book</label>
            <select style={inputStyle} value={slug} onChange={e => setSlug(e.target.value)} required>
              <option value="">— select book —</option>
              {books.filter(b => b.pdf_path).map(b => (
                <option key={b.slug} value={b.slug}>{b.title}</option>
              ))}
            </select>
          </div>
          <div style={{ width: 80 }}>
            <label style={labelStyle}>Qty</label>
            <input style={inputStyle} type="number" min="1" max="20" value={qty} onChange={e => setQty(e.target.value)} required />
          </div>
        </div>

        {selectedBook && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--mist)' }}>
            Interior PDF: <code style={{ color: 'var(--ink)' }}>{selectedBook.pdf_path}</code><br/>
            Cover source: <code style={{ color: 'var(--ink)' }}>{selectedBook.slug}.png</code>
            <span style={{ marginLeft: 8, color: 'var(--gold)' }}>⚠ Use a Lulu-spec cover PDF for production orders</span>
          </div>
        )}

        <div style={{ fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mist)', marginTop: '0.5rem' }}>
          Shipping address
        </div>

        <div>
          <label style={labelStyle}>Full name</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} required placeholder="Recipient name" />
        </div>
        <div>
          <label style={labelStyle}>Street address</label>
          <input style={inputStyle} value={street} onChange={e => setStreet(e.target.value)} required placeholder="123 Main Street" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={city} onChange={e => setCity(e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>State / Province</label>
            <input style={inputStyle} value={state} onChange={e => setState_(e.target.value)} required placeholder="NY" />
          </div>
          <div>
            <label style={labelStyle}>Postcode</label>
            <input style={inputStyle} value={postcode} onChange={e => setPostcode(e.target.value)} required />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Country code</label>
            <input style={inputStyle} value={country} onChange={e => setCountry(e.target.value.toUpperCase())} required placeholder="US" maxLength={2} />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+1 555 000 0000" />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn--primary"
          disabled={status === 'submitting' || !slug || !name || !street || !city || !state || !postcode || !phone}
          style={{ maxWidth: 240 }}
        >
          {status === 'submitting' ? 'Submitting to Lulu…' : 'Order print copy'}
        </button>
      </form>
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
            display: 'grid', gridTemplateColumns: '1fr auto auto auto',
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
            <span style={{ fontSize: '0.68rem', color: b.epub_path ? 'var(--gold)' : 'var(--mist)' }}>
              {b.epub_path ? 'EPUB ✓' : 'No EPUB'}
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
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
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
    setSaveMsg(null)
    try {
      const r = await fetch('/api/admin/books', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body:    JSON.stringify({
          slug:              result.book.slug,
          description:       editedMeta.description,
          short_description: editedMeta.shortDescription,
          tagline:           editedMeta.tagline,
        }),
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        setSaveMsg({ ok: false, text: data.error ?? `Save failed (${r.status})` })
      } else {
        setSaveMsg({ ok: true, text: 'Metadata saved to catalogue.' })
      }
    } catch {
      setSaveMsg({ ok: false, text: 'Network error — changes not saved.' })
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

  if (!authed) return <AuthGate onAuth={handleAuth} error={authError} />

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

          {saveMsg && (
            <div style={{
              padding: '0.75rem 1rem', fontSize: '0.82rem', marginTop: '1rem',
              background: saveMsg.ok ? 'rgba(46,125,50,0.07)' : 'rgba(192,57,43,0.07)',
              border: `1px solid ${saveMsg.ok ? 'rgba(46,125,50,0.3)' : 'rgba(192,57,43,0.3)'}`,
              color: saveMsg.ok ? '#2e7d32' : '#c0392b',
            }}>
              {saveMsg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
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

      {/* ── Audiobook generation ── */}
      <AudiobookSection adminKey={adminKey!} />

      {/* ── Lulu print-on-demand ── */}
      <LuluSection adminKey={adminKey!} />

      {/* ── Distribution guides ── */}
      <DistributionGuides />
    </div>
  )
}
