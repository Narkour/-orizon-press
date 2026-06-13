import { useState, useRef, useEffect } from 'react'
import { bustBooksCache } from '../hooks/useBooks'
import { usePenNames, bustPenNamesCache } from '../hooks/usePenNames'

// ─── Types ────────────────────────────────────────────────────────────────────
interface BookRow {
  id: string; slug: string; title: string; author: string
  genre: string; available: boolean; pdf_path: string; epub_path: string | null
  cover_url: string; price: number; created_at: string
  audio_price?: number | null; audio_available?: boolean | null
  description?: string | null; short_description?: string | null; tagline?: string | null
}

interface SegmentState {
  index: number
  title: string
  text: string
  status: 'idle' | 'generating' | 'done' | 'error'
  errorMsg?: string
  result?: { index: number; title: string; path: string; url: string; sizeMb: number }
}

function splitIntoSegments(text: string, maxChars = 5_000): string[] {
  const paragraphs = text.split(/\n{2,}/)
  const out: string[] = []
  let buf = ''
  for (const p of paragraphs) {
    if (!p.trim()) continue
    const combined = buf ? buf + '\n\n' + p : p
    if (combined.length <= maxChars) {
      buf = combined
    } else {
      if (buf) out.push(buf.trim())
      if (p.length > maxChars) {
        const sentences = p.match(/[^.!?]+[.!?]+\s*/g) ?? [p]
        let sbuf = ''
        for (const s of sentences) {
          if ((sbuf + s).length <= maxChars) { sbuf += s }
          else { if (sbuf) out.push(sbuf.trim()); sbuf = s }
        }
        buf = sbuf
      } else {
        buf = p
      }
    }
  }
  if (buf.trim()) out.push(buf.trim())
  return out.filter(s => s.length > 0)
}

function detectSegmentTitle(text: string, index: number): string {
  const firstLine = text.split('\n')[0].trim().slice(0, 80)
  if (/^(chapter|part|prologue|epilogue|introduction|preface|afterword|section)\b/i.test(firstLine)) {
    return firstLine
  }
  return `Segment ${index + 1}`
}

function clientSlugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80)
}

interface GeneratedMetadata {
  description: string; shortDescription: string
  bisac: string[]; seoKeywords: string[]; tagline: string
}

interface UploadResult {
  book: BookRow; metadata: GeneratedMetadata
  files: { pdf: string; epub: string; cover?: string }; message: string
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
  // African
  'African History',
  'African Spirituality & Consciousness',
  // Fiction
  'Literary Fiction',
  'Historical Fiction',
  'Romance',
  'Crime & Thriller',
  'Mystery',
  'Legal & Courtroom Drama',
  'Science Fiction & Fantasy',
  "Children's Fiction",
  "Children's Books",
  'Young Adult',
  // Non-Fiction
  'Self-Help & Personal Growth',
  'Biography & Memoir',
  'Health & Wellness',
  'True Crime',
  'Science & Society',
  'Religion & Spirituality',
  'Christian & Faith',
  'Biblical Studies',
  'Education & Textbooks',
  'Metaphysics & Philosophy',
]

function GenrePicker({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (g: string) =>
    onChange(selected.includes(g) ? selected.filter(x => x !== g) : [...selected, g])

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
      gap: '0.3rem', padding: '0.6rem 0.75rem',
      border: '1px solid var(--border)', background: 'white',
      maxHeight: 220, overflowY: 'auto',
    }}>
      {GENRES.map(g => (
        <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.82rem', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={selected.includes(g)}
            onChange={() => toggle(g)}
            style={{ flexShrink: 0 }}
          />
          {g}
        </label>
      ))}
    </div>
  )
}

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

function AudiobookSection({ adminKey }: { adminKey: string }) {
  const [books, setBooks] = useState<BookRow[]>([])
  const [selectedSlug, setSelectedSlug] = useState('')
  const [voiceId, setVoiceId] = useState(VOICES[0].id)
  const [extracting, setExtracting] = useState(false)
  const [segments, setSegments] = useState<SegmentState[]>([])
  const [generatingAll, setGeneratingAll] = useState(false)
  const [audioPrice, setAudioPrice] = useState('')
  const [audioAvailable, setAudioAvailable] = useState(false)
  const [publishStatus, setPublishStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/books', { headers: { Authorization: `Bearer ${adminKey}` } })
      .then(r => r.json())
      .then(data => setBooks(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [adminKey])

  useEffect(() => {
    if (!selectedSlug) { setAudioPrice(''); setAudioAvailable(false); setSegments([]); return }
    const book = books.find(b => b.slug === selectedSlug)
    if (book) {
      setAudioPrice(book.audio_price != null ? String(book.audio_price) : '')
      setAudioAvailable(book.audio_available ?? false)
    }
    setSegments([])
  }, [selectedSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setExtracting(true)
    try {
      const buf = await file.arrayBuffer()
      const mammothMod = await import('mammoth')
      type ExtractFn = (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
      const extractRawText: ExtractFn = (mammothMod as { extractRawText?: ExtractFn }).extractRawText
        ?? (mammothMod as { default?: { extractRawText?: ExtractFn } }).default?.extractRawText
        ?? (() => { throw new Error('mammoth.extractRawText not found') })
      const extracted = await extractRawText({ arrayBuffer: buf })
      const segs = splitIntoSegments(extracted.value)
      setSegments(segs.map((text, i) => ({
        index: i,
        title: detectSegmentTitle(text, i),
        text,
        status: 'idle',
      })))
    } catch {
      alert('Failed to extract text from DOCX. Make sure it is a valid .docx file.')
    } finally {
      setExtracting(false)
      if (e.target) e.target.value = ''
    }
  }

  const generateSegment = async (idx: number) => {
    const seg = segments[idx]
    if (!seg) return
    setSegments(prev => prev.map((s, i) => i === idx ? { ...s, status: 'generating', errorMsg: undefined } : s))
    try {
      const r = await fetch('/api/admin/elevenlabs-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({
          slug: selectedSlug,
          text: seg.text,
          voiceId,
          segmentIndex: idx,
          segmentTitle: seg.title,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? `Server error ${r.status}`)
      setSegments(prev => prev.map((s, i) => i === idx ? { ...s, status: 'done', result: data.segment } : s))
    } catch (err) {
      setSegments(prev => prev.map((s, i) => i === idx ? {
        ...s, status: 'error',
        errorMsg: err instanceof Error ? err.message : 'Generation failed',
      } : s))
    }
  }

  const generateAll = async () => {
    if (generatingAll || !selectedSlug) return
    setGeneratingAll(true)
    for (let i = 0; i < segments.length; i++) {
      if (segments[i]?.status === 'done') continue
      await generateSegment(i)
    }
    setGeneratingAll(false)
  }

  const savePublishSettings = async () => {
    if (!selectedSlug) return
    setPublishStatus('saving')
    try {
      const r = await fetch('/api/admin/books', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({
          slug: selectedSlug,
          audio_price: audioPrice ? parseFloat(audioPrice) : null,
          audio_available: audioAvailable,
        }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? 'Save failed')
      }
      setPublishStatus('saved')
      setTimeout(() => setPublishStatus('idle'), 2000)
    } catch {
      setPublishStatus('error')
      setTimeout(() => setPublishStatus('idle'), 3000)
    }
  }

  const doneCount = segments.filter(s => s.status === 'done').length
  const errorCount = segments.filter(s => s.status === 'error').length

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
        Upload a DOCX to extract text. Each segment ≤ 5,000 chars is sent to ElevenLabs one at a time.
        Set price and make available once all segments are generated.
      </p>

      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Book</label>
            <select style={inputStyle} value={selectedSlug} onChange={e => setSelectedSlug(e.target.value)}>
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

        {selectedSlug && (
          <div>
            <label style={labelStyle}>
              {extracting ? 'Extracting text…' : 'Manuscript DOCX — upload to split into segments'}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleDocxUpload}
              disabled={extracting || generatingAll}
              style={{ fontSize: '0.82rem', fontFamily: 'var(--font-body)' }}
            />
          </div>
        )}

        {segments.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ ...labelStyle, marginBottom: 0 }}>
                {segments.length} segments · {doneCount} done{errorCount > 0 ? ` · ${errorCount} errors` : ''}
              </span>
              <button
                className="btn btn--primary"
                style={{ fontSize: '0.68rem' }}
                disabled={generatingAll || doneCount === segments.length}
                onClick={generateAll}
              >
                {generatingAll ? 'Generating…' : 'Generate All'}
              </button>
            </div>
            <div style={{ border: '1px solid var(--border)', maxHeight: 380, overflowY: 'auto' }}>
              {segments.map((seg, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto',
                  gap: '0.75rem', alignItems: 'center',
                  padding: '0.6rem 0.85rem',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  background: seg.status === 'error'
                    ? 'rgba(192,57,43,0.04)'
                    : seg.status === 'done'
                      ? 'rgba(46,125,50,0.04)'
                      : 'var(--parchment)',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
                      {seg.title}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--mist)', marginTop: 1 }}>
                      {seg.text.length.toLocaleString()} chars
                      {seg.status === 'error' && (
                        <span style={{ color: '#c0392b', marginLeft: 6 }}>{seg.errorMsg}</span>
                      )}
                      {seg.status === 'done' && seg.result && (
                        <span style={{ color: '#2e7d32', marginLeft: 6 }}>✓ {seg.result.sizeMb} MB</span>
                      )}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    color: seg.status === 'done' ? '#2e7d32'
                      : seg.status === 'error' ? '#c0392b'
                        : seg.status === 'generating' ? 'var(--gold)'
                          : 'var(--mist)',
                  }}>
                    {seg.status === 'generating' ? '⟳' : seg.status === 'done' ? '✓' : seg.status === 'error' ? '✗' : '–'}
                  </span>
                  <button
                    className="btn btn--outline"
                    style={{ fontSize: '0.6rem' }}
                    disabled={seg.status === 'generating' || generatingAll}
                    onClick={() => generateSegment(i)}
                  >
                    {seg.status === 'error' ? 'Retry' : seg.status === 'done' ? 'Regen' : 'Generate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedSlug && (
          <div style={{ padding: '1rem', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mist)', marginBottom: '0.85rem' }}>
              Publish settings
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Audiobook price (USD)</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 12.99"
                  value={audioPrice}
                  onChange={e => setAudioPrice(e.target.value)}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', cursor: 'pointer', paddingBottom: '0.65rem' }}>
                <input type="checkbox" checked={audioAvailable} onChange={e => setAudioAvailable(e.target.checked)} />
                Make available
              </label>
            </div>
            <button
              className="btn btn--primary"
              style={{ fontSize: '0.72rem', marginTop: '0.75rem' }}
              disabled={publishStatus === 'saving'}
              onClick={savePublishSettings}
            >
              {publishStatus === 'saving'
                ? 'Saving…'
                : publishStatus === 'saved'
                  ? '✓ Saved'
                  : publishStatus === 'error'
                    ? '✗ Failed — try again'
                    : 'Save publish settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── EPUB compressor ─────────────────────────────────────────────────────────
const COMPRESS_TARGETS = [
  { slug: 'lost-kingdoms-of-africa',  label: 'Lost Kingdoms of Africa' },
  { slug: 'messengers-from-sirius',   label: 'Messengers from Sirius' },
]

function CompressEpubSection({ adminKey }: { adminKey: string }) {
  const [results, setResults] = useState<Record<string, { status: string; detail: string }>>({})

  const compress = async (slug: string) => {
    setResults(r => ({ ...r, [slug]: { status: 'running', detail: 'Downloading & compressing…' } }))
    try {
      const res = await fetch('/api/admin/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ resource: 'compress-epub', slug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      setResults(r => ({
        ...r,
        [slug]: {
          status: 'done',
          detail: `${data.originalMB} MB → ${data.compressedMB} MB  (saved ${data.savedMB} MB, removed ${data.removedImages} image files)`,
        },
      }))
    } catch (err) {
      setResults(r => ({
        ...r,
        [slug]: { status: 'error', detail: err instanceof Error ? err.message : 'Failed' },
      }))
    }
  }

  const eyebrow: React.CSSProperties = {
    fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mist)',
  }

  return (
    <div style={{ marginTop: '4rem', borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
      <div style={{ ...eyebrow, marginBottom: '0.4rem' }}>EPUB Compression</div>
      <p style={{ color: 'var(--mist)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
        Strip embedded images from oversized EPUBs. Safe to run multiple times — overwrites the same file.
        Takes up to 2–3 minutes per book.
      </p>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {COMPRESS_TARGETS.map(t => {
          const r = results[t.slug]
          return (
            <div key={t.slug} style={{
              display: 'grid', gridTemplateColumns: '1fr auto',
              gap: '1rem', alignItems: 'center',
              padding: '0.85rem 1rem', border: '1px solid var(--border)', background: 'var(--parchment)',
            }}>
              <div>
                <span style={{ fontSize: '0.88rem', fontFamily: 'var(--font-display)' }}>{t.label}</span>
                {r && (
                  <span style={{
                    display: 'block', fontSize: '0.72rem', marginTop: 3,
                    color: r.status === 'done' ? '#2e7d32' : r.status === 'error' ? '#c0392b' : 'var(--mist)',
                  }}>
                    {r.detail}
                  </span>
                )}
              </div>
              <button
                className="btn btn--outline"
                style={{ fontSize: '0.68rem', flexShrink: 0 }}
                disabled={r?.status === 'running'}
                onClick={() => compress(t.slug)}
              >
                {r?.status === 'running' ? 'Compressing…' : r?.status === 'done' ? 'Run Again' : 'Compress'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Sales tracker ────────────────────────────────────────────────────────────
interface OrderRow {
  paypal_order_id: string
  buyer_email: string
  book_slug: string
  book_title: string
  amount: number
  order_type: string
  created_at: string
  pen_name: string | null
}

function SalesChart({ orders }: { orders: OrderRow[] }) {
  if (orders.length === 0) return null

  // Build last 6 months of monthly revenue
  const now = new Date()
  const months: { label: string; revenue: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('default', { month: 'short' })
    months.push({ label, revenue: 0 })
    for (const o of orders) {
      const ok = o.created_at?.slice(0, 7)
      if (ok === key) months[months.length - 1].revenue += o.amount
    }
  }

  const max = Math.max(...months.map(m => m.revenue), 1)
  const W = 580, H = 140, padL = 44, padB = 28, padT = 12, padR = 12
  const barW = (W - padL - padR) / months.length
  const plotH = H - padT - padB

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
      {/* y-axis gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = padT + plotH * (1 - t)
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--border)" strokeWidth={1} />
            <text x={padL - 5} y={y + 4} textAnchor="end" fontSize={9} fill="var(--mist)">
              ${Math.round(max * t)}
            </text>
          </g>
        )
      })}

      {/* bars */}
      {months.map((m, i) => {
        const bh = max > 0 ? (m.revenue / max) * plotH : 0
        const x = padL + i * barW + barW * 0.15
        const bwInner = barW * 0.7
        const y = padT + plotH - bh
        return (
          <g key={i}>
            <rect x={x} y={y} width={bwInner} height={bh} fill="var(--gold)" opacity={0.85} rx={2} />
            <text x={x + bwInner / 2} y={H - padB + 14} textAnchor="middle" fontSize={9} fill="var(--mist)">
              {m.label}
            </text>
            {m.revenue > 0 && (
              <text x={x + bwInner / 2} y={y - 4} textAnchor="middle" fontSize={8} fill="var(--ink)">
                ${m.revenue.toFixed(0)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function SalesTracker({ adminKey }: { adminKey: string }) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/books?resource=orders', { headers: { Authorization: `Bearer ${adminKey}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setOrders(data)
        else setError(data.error ?? 'Failed to load orders')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [adminKey])

  const eyebrow: React.CSSProperties = {
    fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mist)',
  }

  if (loading) return (
    <div style={{ marginTop: '4rem', borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
      <div style={eyebrow}>Sales Tracker</div>
      <p style={{ color: 'var(--mist)', fontSize: '0.82rem', marginTop: '0.5rem' }}>Loading orders…</p>
    </div>
  )

  const totalRevenue = orders.reduce((s, o) => s + (o.amount ?? 0), 0)
  const unitsSold = orders.length

  // Revenue per book
  const perBook = Object.values(
    orders.reduce<Record<string, { title: string; revenue: number; units: number }>>((acc, o) => {
      if (!acc[o.book_slug]) acc[o.book_slug] = { title: o.book_title, revenue: 0, units: 0 }
      acc[o.book_slug].revenue += o.amount
      acc[o.book_slug].units += 1
      return acc
    }, {})
  ).sort((a, b) => b.revenue - a.revenue)

  // Revenue per pen name
  const perPen = Object.values(
    orders.reduce<Record<string, { name: string; revenue: number; units: number }>>((acc, o) => {
      const key = o.pen_name ?? 'Unknown'
      if (!acc[key]) acc[key] = { name: key, revenue: 0, units: 0 }
      acc[key].revenue += o.amount
      acc[key].units += 1
      return acc
    }, {})
  ).sort((a, b) => b.revenue - a.revenue)

  return (
    <div style={{ marginTop: '4rem', borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
      <div style={{ ...eyebrow, marginBottom: '0.5rem' }}>Sales Tracker</div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.3)', fontSize: '0.82rem', color: '#c0392b', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}` },
          { label: 'Units Sold', value: String(unitsSold) },
          { label: 'Avg Order', value: unitsSold > 0 ? `$${(totalRevenue / unitsSold).toFixed(2)}` : '—' },
        ].map(s => (
          <div key={s.label} style={{ padding: '1rem', border: '1px solid var(--border)', background: 'var(--parchment)' }}>
            <div style={{ ...eyebrow, marginBottom: '0.3rem' }}>{s.label}</div>
            <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ ...eyebrow, marginBottom: '0.75rem' }}>Monthly Revenue — Last 6 Months</div>
        <div style={{ border: '1px solid var(--border)', background: 'var(--parchment)', padding: '1rem 0.5rem 0.5rem' }}>
          <SalesChart orders={orders} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Revenue per book */}
        <div>
          <div style={{ ...eyebrow, marginBottom: '0.75rem' }}>Revenue per Book</div>
          {perBook.length === 0
            ? <p style={{ fontSize: '0.8rem', color: 'var(--mist)' }}>No sales yet.</p>
            : (
              <div style={{ border: '1px solid var(--border)' }}>
                {perBook.map((b, i) => (
                  <div key={b.title} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    gap: '0.5rem', padding: '0.55rem 0.75rem', alignItems: 'center',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    background: 'var(--parchment)',
                  }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--ink)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--mist)', whiteSpace: 'nowrap' }}>
                      ${b.revenue.toFixed(2)} · {b.units} sold
                    </span>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Revenue per pen name */}
        <div>
          <div style={{ ...eyebrow, marginBottom: '0.75rem' }}>Revenue per Pen Name</div>
          {perPen.length === 0
            ? <p style={{ fontSize: '0.8rem', color: 'var(--mist)' }}>No sales yet.</p>
            : (
              <div style={{ border: '1px solid var(--border)' }}>
                {perPen.map((p, i) => (
                  <div key={p.name} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    gap: '0.5rem', padding: '0.55rem 0.75rem', alignItems: 'center',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    background: 'var(--parchment)',
                  }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--ink)' }}>{p.name}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--mist)', whiteSpace: 'nowrap' }}>
                      ${p.revenue.toFixed(2)} · {p.units} sold
                    </span>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Orders table */}
      <div>
        <div style={{ ...eyebrow, marginBottom: '0.75rem' }}>All Orders — {unitsSold} total</div>
        {orders.length === 0
          ? <p style={{ fontSize: '0.8rem', color: 'var(--mist)' }}>No orders yet.</p>
          : (
            <div style={{ border: '1px solid var(--border)', maxHeight: 400, overflowY: 'auto' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '100px 1fr 1fr auto auto',
                gap: '0.5rem', padding: '0.5rem 0.75rem',
                background: 'rgba(0,0,0,0.04)',
                borderBottom: '1px solid var(--border)',
                position: 'sticky', top: 0,
              }}>
                {['Date', 'Book', 'Buyer', 'Type', 'Amount'].map(h => (
                  <span key={h} style={{ ...eyebrow, marginBottom: 0 }}>{h}</span>
                ))}
              </div>
              {orders.map((o, i) => (
                <div key={o.paypal_order_id} style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 1fr auto auto',
                  gap: '0.5rem', padding: '0.55rem 0.75rem', alignItems: 'center',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  background: 'var(--parchment)',
                }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--mist)', whiteSpace: 'nowrap' }}>
                    {new Date(o.created_at).toLocaleDateString()}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.book_title}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--mist)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.buyer_email}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--mist)', whiteSpace: 'nowrap' }}>
                    {o.order_type ?? 'ebook'}
                  </span>
                  <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-display)', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                    ${Number(o.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
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
      .then(r => r.json()).then(data => setBooks(Array.isArray(data) ? data : [])).catch(() => {})
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

// ─── Edit book form ───────────────────────────────────────────────────────────
function EditBookForm({ book, adminKey, onSaved, onCancel }: {
  book: BookRow
  adminKey: string
  onSaved: (updates: Partial<BookRow>) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(book.title)
  const [author, setAuthor] = useState(book.author)
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    () => book.genre ? book.genre.split(',').map(g => g.trim()).filter(Boolean) : []
  )
  const [price, setPrice] = useState(String(book.price))
  const [available, setAvailable] = useState(book.available)
  const [description, setDescription] = useState(book.description ?? '')
  const [shortDescription, setShortDescription] = useState(book.short_description ?? '')
  const [tagline, setTagline] = useState(book.tagline ?? '')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState(book.cover_url || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const coverInputRef = useRef<HTMLInputElement>(null)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)',
    fontFamily: 'var(--font-body)', fontSize: '0.85rem', background: 'white',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.6rem', letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--mist)', marginBottom: '0.3rem',
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const patchRes = await fetch('/api/admin/books', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({
          slug: book.slug, title, author,
          genre: selectedGenres.join(', '),
          price: parseFloat(price), available,
          description, short_description: shortDescription, tagline,
        }),
      })
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}))
        throw new Error(data.error ?? `Save failed (${patchRes.status})`)
      }

      let newCoverUrl = book.cover_url
      if (coverFile) {
        const form = new FormData()
        form.append('slug', book.slug)
        form.append('cover', coverFile)
        const coverRes = await fetch('/api/admin/upload-book', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminKey}` },
          body: form,
        })
        const coverData = await coverRes.json()
        if (!coverRes.ok) throw new Error(coverData.error ?? 'Cover upload failed')
        newCoverUrl = coverData.coverUrl
      }

      bustBooksCache()
      onSaved({ title, author, genre: selectedGenres.join(', '), price: parseFloat(price), available, description, short_description: shortDescription, tagline, cover_url: newCoverUrl })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSave}
      style={{ padding: '1.25rem 1rem', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid var(--border)' }}
    >
      {error && (
        <div style={{ padding: '0.6rem 0.85rem', background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.3)', fontSize: '0.8rem', color: '#c0392b', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
        <div>
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div>
          <label style={labelStyle}>Author</label>
          <input style={inputStyle} value={author} onChange={e => setAuthor(e.target.value)} required />
        </div>
        <div>
          <label style={labelStyle}>Price ($)</label>
          <input style={inputStyle} type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
        </div>
      </div>
      <div style={{ marginBottom: '0.85rem' }}>
        <label style={labelStyle}>
          Genre{selectedGenres.length > 0 ? ` — ${selectedGenres.length} selected` : ' — select at least one'}
        </label>
        <GenrePicker selected={selectedGenres} onChange={setSelectedGenres} />
      </div>

      <div style={{ marginBottom: '0.85rem' }}>
        <label style={labelStyle}>Tagline</label>
        <input style={inputStyle} value={tagline} onChange={e => setTagline(e.target.value)} placeholder="One-line tagline for the book" />
      </div>
      <div style={{ marginBottom: '0.85rem' }}>
        <label style={labelStyle}>Short description</label>
        <input style={inputStyle} value={shortDescription} onChange={e => setShortDescription(e.target.value)} placeholder="One sentence" />
      </div>
      <div style={{ marginBottom: '0.85rem' }}>
        <label style={labelStyle}>Full description</label>
        <textarea
          style={{ ...inputStyle, height: 120, resize: 'vertical' }}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Full catalogue description"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem' }}>
          <input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} />
          Live (visible in catalogue)
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {coverPreview ? (
            <img src={coverPreview} alt="Cover" style={{ width: 32, aspectRatio: '2/3', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
          ) : (
            <div style={{ width: 32, aspectRatio: '2/3', background: 'var(--border)', flexShrink: 0 }} />
          )}
          <button
            type="button"
            className="btn btn--outline"
            style={{ fontSize: '0.68rem' }}
            onClick={() => coverInputRef.current?.click()}
          >
            {coverPreview ? 'Change cover' : 'Add cover'}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0]
              if (!f) return
              setCoverFile(f)
              const reader = new FileReader()
              reader.onload = ev => setCoverPreview(ev.target?.result as string)
              reader.readAsDataURL(f)
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" className="btn btn--primary" style={{ fontSize: '0.72rem' }} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button type="button" className="btn btn--outline" style={{ fontSize: '0.72rem' }} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Book list ────────────────────────────────────────────────────────────────
function BookList({ adminKey, refreshKey }: { adminKey: string; refreshKey: number }) {
  const [books, setBooks] = useState<BookRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setFetchError('')
    fetch('/api/admin/books', { headers: { Authorization: `Bearer ${adminKey}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setBooks(data)
        else setFetchError(data.error ?? 'Unexpected response from server')
      })
      .catch(() => setFetchError('Network error — could not load books'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [adminKey, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (b: BookRow) => {
    if (!window.confirm(`Delete "${b.title}"? This removes the book record and its files permanently.`)) return
    setDeletingSlug(b.slug)
    try {
      const r = await fetch('/api/admin/books', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ slug: b.slug }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        alert(d.error ?? 'Delete failed')
        return
      }
      setBooks(prev => prev.filter(x => x.slug !== b.slug))
      bustBooksCache()
    } catch {
      alert('Network error — delete failed')
    } finally {
      setDeletingSlug(null)
    }
  }

  if (loading) return (
    <div style={{ marginTop: '3rem' }}>
      <div style={{ fontSize: '0.6rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mist)', marginBottom: '1rem' }}>
        Catalogue
      </div>
      <p style={{ color: 'var(--mist)', fontSize: '0.82rem' }}>Loading books…</p>
    </div>
  )

  return (
    <div style={{ marginTop: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.6rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mist)' }}>
          Catalogue — {books.length} title{books.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={load}
          style={{ fontSize: '0.62rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mist)', padding: 0, textDecoration: 'underline', fontFamily: 'var(--font-body)' }}
        >
          Refresh
        </button>
      </div>

      {fetchError && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.3)', fontSize: '0.82rem', color: '#c0392b', marginBottom: '1rem' }}>
          {fetchError}
        </div>
      )}

      {books.length === 0 && !fetchError && (
        <p style={{ color: 'var(--mist)', fontSize: '0.82rem' }}>No books in catalogue yet.</p>
      )}

      {books.length > 0 && (
        <div style={{ border: '1px solid var(--border)' }}>
          {books.map((b, i) => (
            <div key={b.id}>
              <div
                style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto auto auto auto',
                  gap: '0.75rem', alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  background: editingSlug === b.slug ? 'rgba(0,0,0,0.02)' : 'var(--parchment)',
                  cursor: 'pointer',
                }}
                onClick={() => setEditingSlug(editingSlug === b.slug ? null : b.slug)}
              >
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
                <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <a
                    href={`/books/${b.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.68rem', color: 'var(--mist)', textDecoration: 'none', whiteSpace: 'nowrap' }}
                    onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
                    onMouseOut={e => (e.currentTarget.style.color = 'var(--mist)')}
                  >
                    View →
                  </a>
                  <button
                    style={{ fontSize: '0.68rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mist)', padding: 0, textDecoration: 'underline', fontFamily: 'var(--font-body)' }}
                    onClick={() => setEditingSlug(editingSlug === b.slug ? null : b.slug)}
                  >
                    {editingSlug === b.slug ? 'Cancel' : 'Edit'}
                  </button>
                  <button
                    style={{ fontSize: '0.68rem', background: 'none', border: 'none', cursor: 'pointer', color: deletingSlug === b.slug ? 'var(--mist)' : '#c0392b', padding: 0, fontFamily: 'var(--font-body)' }}
                    disabled={deletingSlug === b.slug}
                    onClick={() => handleDelete(b)}
                  >
                    {deletingSlug === b.slug ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>

              {editingSlug === b.slug && (
                <EditBookForm
                  book={b}
                  adminKey={adminKey}
                  onSaved={updates => {
                    setBooks(prev => prev.map(x => x.slug === b.slug ? { ...x, ...updates } : x))
                    setEditingSlug(null)
                  }}
                  onCancel={() => setEditingSlug(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
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

  const { penNames } = usePenNames()

  // Fields
  const [title,        setTitle]        = useState('')
  const [authorVal,    setAuthorVal]    = useState('')
  const [penNameId,    setPenNameId]    = useState('')
  const [newPenNameMode, setNewPenNameMode] = useState(false)
  const [newPenNameName, setNewPenNameName] = useState('')
  const [genres,       setGenres]       = useState<string[]>([])
  const [price,        setPrice]        = useState('9.99')
  const [file,         setFile]         = useState<File | null>(null)
  const [coverFile,    setCoverFile]    = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')

  // Upload state
  const [step,   setStep]   = useState<Step>('idle')
  const [stage,  setStage]  = useState<ProcessStage | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [errMsg, setErrMsg] = useState('')
  const [editedMeta, setEditedMeta] = useState<GeneratedMetadata | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [bookListKey, setBookListKey] = useState(0)
  const fileRef  = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

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
    if (!file || !title || genres.length === 0 || !adminKey) return

    const effectivePenNameId = newPenNameMode
      ? clientSlugify(newPenNameName || authorVal)
      : penNameId

    setStep('processing')
    setStage('extract')
    setErrMsg('')
    setResult(null)

    const form = new FormData()
    form.append('file',       file)
    form.append('title',      title)
    form.append('author',     authorVal)
    form.append('penNameId',  effectivePenNameId)
    form.append('genre',      genres.join(', '))
    form.append('price',      price)
    if (coverFile) form.append('cover', coverFile)

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

      // Auto-create pen name profile if this is a new one
      if (newPenNameMode && newPenNameName.trim()) {
        const penSlug = clientSlugify(newPenNameName)
        await fetch('/api/admin/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
          body: JSON.stringify({
            resource: 'pen-name',
            id: penSlug,
            slug: penSlug,
            name: newPenNameName.trim(),
            bio: 'Bio coming soon.',
            short_bio: 'A writer at Orizon Press.',
            genres: genres.length > 0 ? genres : [],
            accent_color: '#8B7355',
          }),
        }).catch(() => {})
        bustPenNamesCache()
      }

      setResult(data)
      setEditedMeta(data.metadata)
      setStage('done')
      setStep('result')
      bustBooksCache()
      setBookListKey(k => k + 1)
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
    setTitle(''); setAuthorVal(''); setPenNameId('')
    setNewPenNameMode(false); setNewPenNameName('')
    setGenres([]); setPrice('9.99'); setFile(null); setCoverFile(null); setCoverPreview('')
    if (fileRef.current) fileRef.current.value = ''
    if (coverRef.current) coverRef.current.value = ''
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <span className="eyebrow">Orizon Press</span>
          <a
            href="/"
            style={{
              fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--mist)', textDecoration: 'none', transition: 'color var(--duration)',
            }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--mist)')}
          >
            ← Back to Site
          </a>
        </div>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
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
            <div>
              <label style={labelStyle}>Cover image — PNG / JPG / WebP (optional)</label>
              <input
                ref={coverRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                onChange={e => {
                  const f = e.target.files?.[0] ?? null
                  setCoverFile(f)
                  if (f) {
                    const reader = new FileReader()
                    reader.onload = ev => setCoverPreview(ev.target?.result as string)
                    reader.readAsDataURL(f)
                  } else {
                    setCoverPreview('')
                  }
                }}
                style={{ fontSize: '0.82rem', fontFamily: 'var(--font-body)' }}
              />
              {coverPreview && (
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  style={{
                    marginTop: '0.75rem', display: 'block',
                    width: 80, aspectRatio: '2/3', objectFit: 'cover',
                    boxShadow: 'var(--shadow-mid)',
                  }}
                />
              )}
            </div>
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
              {!newPenNameMode ? (
                <select
                  style={inputStyle}
                  value={penNameId}
                  onChange={e => {
                    if (e.target.value === '__new__') {
                      setNewPenNameMode(true)
                      setPenNameId('')
                    } else {
                      setPenNameId(e.target.value)
                    }
                  }}
                >
                  <option value="">— select existing —</option>
                  {penNames.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  <option value="__new__">+ Create new pen name…</option>
                </select>
              ) : (
                <div style={{ display: 'grid', gap: '0.4rem' }}>
                  <input
                    style={inputStyle}
                    value={newPenNameName}
                    onChange={e => setNewPenNameName(e.target.value)}
                    placeholder="New pen name (e.g. Sarah Rivers)"
                    autoFocus
                  />
                  <button
                    type="button"
                    style={{ fontSize: '0.65rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mist)', padding: 0, textAlign: 'left', fontFamily: 'var(--font-body)', textDecoration: 'underline' }}
                    onClick={() => { setNewPenNameMode(false); setNewPenNameName('') }}
                  >
                    ← Use existing pen name
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              Genre{genres.length > 0 ? ` — ${genres.length} selected` : ' — select at least one'}
            </label>
            <GenrePicker selected={genres} onChange={setGenres} />
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
            ✓ {result.message} — PDF: {result.files.pdf} · EPUB: {result.files.epub}{result.files.cover ? ' · Cover uploaded' : ' · No cover (add via Supabase table editor)'}
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

      {/* ── Book list — always visible ── */}
      {authed && <BookList adminKey={adminKey!} refreshKey={bookListKey} />}

      {/* ── Audiobook generation ── */}
      <AudiobookSection adminKey={adminKey!} />

      {/* ── Lulu print-on-demand ── */}
      <LuluSection adminKey={adminKey!} />

      {/* ── EPUB compression ── */}
      <CompressEpubSection adminKey={adminKey!} />

      {/* ── Sales tracker ── */}
      <SalesTracker adminKey={adminKey!} />
    </div>
  )
}
