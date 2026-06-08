import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferred || dismissed) return null

  const handleInstall = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 500,
      background: 'var(--parchment)',
      borderTop: '1px solid var(--gold)',
      padding: '0.85rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      boxShadow: '0 -4px 20px rgba(26,20,16,0.12)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ color: 'var(--gold)', fontSize: '1.3rem', lineHeight: 1, flexShrink: 0 }}>◈</span>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--ink)', lineHeight: 1.2 }}>
            Install Orizon Press
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--mist)', marginTop: '0.15rem' }}>
            Add to your home screen for quick access
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <button
          onClick={() => setDismissed(true)}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.68rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '0.45rem 0.85rem',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--mist)',
            cursor: 'pointer',
          }}
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.68rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '0.45rem 1.1rem',
            border: '1px solid var(--gold)',
            background: 'var(--gold)',
            color: 'var(--parchment)',
            cursor: 'pointer',
          }}
        >
          Install
        </button>
      </div>
    </div>
  )
}
