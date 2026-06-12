import { useState, useRef, useEffect } from 'react'
import type { AudioChapter } from '../data/catalogue'

export default function AudiobookPlayer({
  chapters,
}: {
  chapters: AudioChapter[]
}) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const current = chapters[currentIdx]

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    return () => { el.removeEventListener('play', onPlay); el.removeEventListener('pause', onPause) }
  }, [currentIdx])

  const goTo = (idx: number) => {
    setCurrentIdx(idx)
    // Brief timeout to let React re-render the new src before playing
    setTimeout(() => {
      audioRef.current?.play().catch(() => {})
    }, 80)
  }

  const handleEnded = () => {
    if (currentIdx < chapters.length - 1) goTo(currentIdx + 1)
  }

  if (!current) return null

  return (
    <div
      id="audiobook-player"
      style={{ marginTop: '3.5rem', paddingTop: '2.5rem', borderTop: '1px solid var(--border)' }}
    >
      <span className="rule" />
      <span className="eyebrow" style={{ marginBottom: '0.4rem' }}>Audiobook</span>

      {/* Now playing label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginTop: '0.5rem', marginBottom: '0.75rem',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: playing ? 'var(--gold)' : 'var(--border)',
          flexShrink: 0,
          transition: 'background 200ms',
        }} />
        <span style={{ fontSize: '0.78rem', color: 'var(--mist)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
          {current.title}
        </span>
      </div>

      {/* Native audio controls */}
      <audio
        ref={audioRef}
        key={current.url}
        src={current.url}
        controls
        onEnded={handleEnded}
        style={{ width: '100%', marginBottom: '1rem', display: 'block' }}
      />

      {/* Chapter list */}
      <div style={{ border: '1px solid var(--border)' }}>
        {chapters.map((ch, i) => {
          const active = i === currentIdx
          return (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.6rem 0.9rem',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                background: active ? 'rgba(200,145,31,0.06)' : 'var(--parchment)',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontFamily: 'var(--font-body)',
                transition: 'background 120ms',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <span style={{
                  fontSize: '0.6rem', color: active ? 'var(--gold)' : 'var(--mist)',
                  letterSpacing: '0.1em', fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0, minWidth: 22, textAlign: 'right',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{
                  fontSize: '0.82rem',
                  color: active ? 'var(--gold)' : 'var(--ink)',
                  fontWeight: active ? 500 : 400,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {ch.title}
                </span>
              </div>
              {active && (
                <span style={{
                  fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--gold)', flexShrink: 0, marginLeft: '0.75rem',
                }}>
                  {playing ? '▶ Playing' : '❙❙ Paused'}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
