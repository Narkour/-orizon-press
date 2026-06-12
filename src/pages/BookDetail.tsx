import { useState, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { getPenNameById, type Book, type AudioChapter } from '../data/catalogue'
import BookCard from '../components/BookCard'
import ShareButtons from '../components/ShareButtons'
import ReviewSection from '../components/ReviewSection'
import AudiobookPlayer from '../components/AudiobookPlayer'
import { useBooks } from '../hooks/useBooks'
import { useAuth } from '../contexts/AuthContext'

// ─── PayPal SDK browser global ────────────────────────────────────────────────
declare global {
  interface Window {
    paypal?: {
      Buttons: (cfg: {
        style?: Record<string, unknown>
        createOrder: () => Promise<string>
        onApprove: (data: { orderID: string }) => Promise<void>
        onError?: (err: unknown) => void
        onCancel?: () => void
      }) => { render: (selector: string) => Promise<void> }
    }
  }
}

// PayPal client IDs are public by design — safe to embed in browser code
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID

// ─── Sample preview modal ─────────────────────────────────────────────────────
function SampleModal({ book, onClose, onBuy }: { book: Book; onClose: () => void; onBuy: () => void }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(26, 20, 16, 0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        position: 'relative', width: '100%', maxWidth: 660,
        background: 'var(--parchment)',
        boxShadow: '0 20px 60px rgba(26, 20, 16, 0.3)',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '1.5rem 2rem 1rem', borderBottom: '1px solid var(--border)', flexShrink: 0, position: 'relative' }}>
          <span className="eyebrow" style={{ marginBottom: '0.3rem' }}>Sample</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 400 }}>
            {book.title}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: 12, right: 14,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.3rem', color: 'var(--mist)', padding: '4px 8px', lineHeight: 1,
              transition: 'color var(--duration)',
            }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--mist)')}
          >×</button>
        </div>

        <div style={{ padding: '1.75rem 2rem', overflowY: 'auto', flex: 1 }}>
          {book.sampleText?.split('\n').filter(p => p.trim()).map((p, i) => (
            <p key={i} style={{
              fontFamily: 'var(--font-display)', fontSize: '1rem', lineHeight: 1.9,
              color: 'var(--ink)', marginBottom: '1.3rem',
            }}>
              {p}
            </p>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--mist)' }}>
              — End of sample —
            </p>
          </div>
        </div>

        <div style={{
          padding: '1rem 2rem', borderTop: '1px solid var(--border)', flexShrink: 0,
          display: 'flex', gap: '0.75rem', alignItems: 'center',
        }}>
          <button className="btn btn--primary" onClick={onBuy} style={{ fontSize: '0.72rem' }}>
            Buy eBook — ${book.ebook.price.toFixed(2)}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--mist)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Purchase modal ───────────────────────────────────────────────────────────
type Step = 'email' | 'paypal' | 'processing' | 'success' | 'error'

function EbookPurchaseModal({ book, onClose }: { book: Book; onClose: () => void }) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [downloadToken, setDownloadToken] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)

  // Load PayPal SDK and render buttons whenever the paypal step is active
  useEffect(() => {
    if (step !== 'paypal') return

    let active = true
    // Capture email at the moment the paypal step starts — stable for this session
    const buyerEmail = email

    const renderButtons = () => {
      if (!active || !window.paypal) return
      if (!document.getElementById('paypal-button-container')) return

      window.paypal
        .Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 45 },

          createOrder: async () => {
            const res = await fetch('/api/create-paypal-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bookSlug: book.slug,
                bookTitle: book.title,
                amount: book.ebook.price,
                buyerEmail,
              }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Could not create order')
            return data.orderId as string
          },

          onApprove: async (data) => {
            if (!active) return
            setStep('processing')
            try {
              const res = await fetch('/api/capture-paypal-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: data.orderID,
                  buyerEmail,
                  bookSlug: book.slug,
                  bookTitle: book.title,
                  amount: book.ebook.price,
                }),
              })
              const result = await res.json()
              if (!res.ok) throw new Error(result.error ?? 'Payment capture failed')
              setDownloadToken(result.downloadToken)
              setExpiresAt(result.expiresAt)
              setStep('success')
            } catch (err) {
              setErrorMsg(err instanceof Error ? err.message : 'Payment failed')
              setStep('error')
            }
          },

          onError: (err) => {
            if (!active) return
            console.error('[PayPal error]', err)
            setErrorMsg('PayPal encountered an error. Please try again.')
            setStep('error')
          },

          onCancel: () => {
            if (active) setStep('email')
          },
        })
        .render('#paypal-button-container')
        .catch((err) => {
          if (!active) return
          console.error('[PayPal render error]', err)
          setErrorMsg('Could not load the payment form. Please try again.')
          setStep('error')
        })
    }

    if (window.paypal) {
      renderButtons()
    } else {
      const script = document.createElement('script')
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture&components=buttons`
      script.onload = renderButtons
      script.onerror = () => {
        if (!active) return
        setErrorMsg('Could not load PayPal. Check your connection and try again.')
        setStep('error')
      }
      document.head.appendChild(script)
    }

    return () => { active = false }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (step !== 'processing' && e.target === e.currentTarget) onClose()
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailError('')
    setStep('paypal')
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/download-ebook?token=${downloadToken}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Download failed')
      // Open signed URL — Supabase sends Content-Disposition: attachment
      const a = document.createElement('a')
      a.href = data.url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Download failed. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(26, 20, 16, 0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        position: 'relative', width: '100%', maxWidth: 480,
        background: 'var(--parchment)', padding: '2rem',
        boxShadow: '0 20px 60px rgba(26, 20, 16, 0.3)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Close */}
        {step !== 'processing' && (
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.3rem', color: 'var(--mist)', lineHeight: 1, padding: '4px 8px',
              transition: 'color var(--duration)',
            }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--mist)')}
          >×</button>
        )}

        {/* Book summary strip — email + paypal steps */}
        {(step === 'email' || step === 'paypal') && (
          <div style={{
            display: 'flex', gap: '0.75rem', alignItems: 'center',
            padding: '0.75rem', background: 'var(--parchment-mid)',
            marginBottom: '1.5rem', borderLeft: '2px solid var(--gold)',
          }}>
            {book.coverImage && (
              <img
                src={book.coverImage}
                alt=""
                style={{ width: 36, height: 54, objectFit: 'cover', flexShrink: 0 }}
              />
            )}
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', color: 'var(--ink)', lineHeight: 1.3 }}>
                {book.title}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--gold)', marginTop: '0.2rem', fontWeight: 600 }}>
                ${book.ebook.price.toFixed(2)} · eBook
              </div>
            </div>
          </div>
        )}

        {/* ── Step: email ── */}
        {step === 'email' && (
          <>
            <span className="eyebrow" style={{ marginBottom: '0.4rem' }}>Purchase eBook</span>
            <h2 style={{
              fontSize: '1.3rem', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '0.6rem',
            }}>
              Enter your email
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--mist)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Your download link will be valid for 24 hours after purchase.
            </p>
            <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{
                  display: 'block', fontSize: '0.62rem', letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'var(--mist)', marginBottom: '0.4rem',
                }}>
                  Email address
                </label>
                <input
                  type="email"
                  autoFocus
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError('') }}
                  style={{
                    width: '100%', fontFamily: 'var(--font-body)', fontSize: '0.95rem',
                    padding: '0.7rem 1rem', background: 'white', color: 'var(--ink)',
                    border: `1px solid ${emailError ? '#c0392b' : 'var(--border)'}`, outline: 'none',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = emailError ? '#c0392b' : 'var(--gold)')}
                  onBlur={e => (e.currentTarget.style.borderColor = emailError ? '#c0392b' : 'var(--border)')}
                />
                {emailError && (
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#c0392b', marginTop: '0.3rem' }}>
                    {emailError}
                  </span>
                )}
              </div>
              <button type="submit" className="btn btn--primary" style={{ width: '100%', marginTop: '0.25rem' }}>
                Continue to PayPal →
              </button>
            </form>
          </>
        )}

        {/* ── Step: paypal ── */}
        {step === 'paypal' && (
          <>
            <span className="eyebrow" style={{ marginBottom: '0.4rem' }}>Secure Checkout</span>
            <h2 style={{
              fontSize: '1.3rem', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '0.5rem',
            }}>
              Complete payment
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--mist)', marginBottom: '1.25rem' }}>
              Purchasing as{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{email}</strong>
            </p>
            {/* PayPal SDK mounts its buttons here */}
            <div id="paypal-button-container" style={{ minHeight: 55 }} />
            <button
              onClick={() => setStep('email')}
              style={{
                marginTop: '1rem', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--mist)', transition: 'color var(--duration)',
              }}
              onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseOut={e => (e.currentTarget.style.color = 'var(--mist)')}
            >
              ← Change email
            </button>
          </>
        )}

        {/* ── Step: processing ── */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div className="spinner" style={{ margin: '0 auto 1.25rem' }} />
            <h2 style={{
              fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '0.4rem',
            }}>
              Confirming payment…
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--mist)' }}>
              Please do not close this window.
            </p>
          </div>
        )}

        {/* ── Step: success ── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(196, 134, 42, 0.1)', border: '1px solid var(--gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem', fontSize: '1.5rem', color: 'var(--gold)',
            }}>✓</div>
            <span className="eyebrow" style={{ marginBottom: '0.4rem' }}>Payment confirmed</span>
            <h2 style={{
              fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '0.4rem',
            }}>
              Your book is ready
            </h2>
            <p style={{
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: '0.9rem', color: 'var(--mist)', marginBottom: '1.5rem',
            }}>
              {book.title}
            </p>
            <button
              className="btn btn--primary"
              onClick={handleDownload}
              disabled={isDownloading}
              style={{ width: '100%', marginBottom: '1rem', opacity: isDownloading ? 0.7 : 1 }}
            >
              {isDownloading ? 'Preparing download…' : '↓ Download eBook (PDF)'}
            </button>
            {expiryLabel && (
              <p style={{ fontSize: '0.72rem', color: 'var(--mist)', lineHeight: 1.6 }}>
                Link valid until{' '}
                <strong style={{ color: 'var(--ink)' }}>{expiryLabel}</strong>.{' '}
                Confirmation sent to {email}.
              </p>
            )}
          </div>
        )}

        {/* ── Step: error ── */}
        {step === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(192, 57, 43, 0.07)', border: '1px solid rgba(192, 57, 43, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem', fontSize: '1.3rem', color: '#c0392b',
            }}>!</div>
            <h2 style={{
              fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '0.5rem',
            }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--mist)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              {errorMsg || 'An unexpected error occurred.'}
            </p>
            <button
              className="btn btn--primary"
              onClick={() => { setErrorMsg(''); setStep('email') }}
              style={{ width: '100%' }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Audiobook purchase modal ─────────────────────────────────────────────────
function AudiobookPurchaseModal({
  book,
  onClose,
  onSuccess,
}: {
  book: Book
  onClose: () => void
  onSuccess: () => void
}) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (step !== 'paypal') return
    let active = true
    const buyerEmail = email

    const renderButtons = () => {
      if (!active || !window.paypal) return
      if (!document.getElementById('paypal-audiobook-container')) return

      window.paypal
        .Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 45 },
          createOrder: async () => {
            const res = await fetch('/api/create-paypal-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bookSlug: book.slug,
                bookTitle: book.title,
                amount: book.audiobook!.price,
                buyerEmail,
                orderType: 'audiobook',
              }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Could not create order')
            return data.orderId as string
          },
          onApprove: async (data) => {
            if (!active) return
            setStep('processing')
            try {
              const res = await fetch('/api/capture-paypal-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: data.orderID,
                  buyerEmail,
                  bookSlug: book.slug,
                  bookTitle: book.title,
                  amount: book.audiobook!.price,
                  orderType: 'audiobook',
                }),
              })
              const result = await res.json()
              if (!res.ok) throw new Error(result.error ?? 'Payment capture failed')
              setStep('success')
            } catch (err) {
              setErrorMsg(err instanceof Error ? err.message : 'Payment failed')
              setStep('error')
            }
          },
          onError: (err) => {
            if (!active) return
            console.error('[PayPal error]', err)
            setErrorMsg('PayPal encountered an error. Please try again.')
            setStep('error')
          },
          onCancel: () => { if (active) setStep('email') },
        })
        .render('#paypal-audiobook-container')
        .catch((err) => {
          if (!active) return
          console.error('[PayPal render error]', err)
          setErrorMsg('Could not load the payment form. Please try again.')
          setStep('error')
        })
    }

    if (window.paypal) {
      renderButtons()
    } else {
      const script = document.createElement('script')
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture&components=buttons`
      script.onload = renderButtons
      script.onerror = () => {
        if (!active) return
        setErrorMsg('Could not load PayPal. Check your connection and try again.')
        setStep('error')
      }
      document.head.appendChild(script)
    }

    return () => { active = false }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (step !== 'processing' && e.target === e.currentTarget) onClose()
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailError('')
    setStep('paypal')
  }

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(26, 20, 16, 0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        position: 'relative', width: '100%', maxWidth: 480,
        background: 'var(--parchment)', padding: '2rem',
        boxShadow: '0 20px 60px rgba(26, 20, 16, 0.3)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {step !== 'processing' && (
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.3rem', color: 'var(--mist)', lineHeight: 1, padding: '4px 8px',
              transition: 'color var(--duration)',
            }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--mist)')}
          >×</button>
        )}

        {(step === 'email' || step === 'paypal') && (
          <div style={{
            display: 'flex', gap: '0.75rem', alignItems: 'center',
            padding: '0.75rem', background: 'var(--parchment-mid)',
            marginBottom: '1.5rem', borderLeft: '2px solid var(--gold)',
          }}>
            {book.coverImage && (
              <img src={book.coverImage} alt="" style={{ width: 36, height: 54, objectFit: 'cover', flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', color: 'var(--ink)', lineHeight: 1.3 }}>
                {book.title}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--gold)', marginTop: '0.2rem', fontWeight: 600 }}>
                ${book.audiobook!.price!.toFixed(2)} · Audiobook
              </div>
            </div>
          </div>
        )}

        {step === 'email' && (
          <>
            <span className="eyebrow" style={{ marginBottom: '0.4rem' }}>Purchase Audiobook</span>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '0.6rem' }}>
              Enter your email
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--mist)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Instant streaming access after payment.
            </p>
            <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mist)', marginBottom: '0.4rem' }}>
                  Email address
                </label>
                <input
                  type="email"
                  autoFocus
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError('') }}
                  style={{
                    width: '100%', fontFamily: 'var(--font-body)', fontSize: '0.95rem',
                    padding: '0.7rem 1rem', background: 'white', color: 'var(--ink)',
                    border: `1px solid ${emailError ? '#c0392b' : 'var(--border)'}`, outline: 'none',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = emailError ? '#c0392b' : 'var(--gold)')}
                  onBlur={e => (e.currentTarget.style.borderColor = emailError ? '#c0392b' : 'var(--border)')}
                />
                {emailError && (
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#c0392b', marginTop: '0.3rem' }}>
                    {emailError}
                  </span>
                )}
              </div>
              <button type="submit" className="btn btn--primary" style={{ width: '100%', marginTop: '0.25rem' }}>
                Continue to PayPal →
              </button>
            </form>
          </>
        )}

        {step === 'paypal' && (
          <>
            <span className="eyebrow" style={{ marginBottom: '0.4rem' }}>Secure Checkout</span>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '0.5rem' }}>
              Complete payment
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--mist)', marginBottom: '1.25rem' }}>
              Purchasing as <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{email}</strong>
            </p>
            <div id="paypal-audiobook-container" style={{ minHeight: 55 }} />
            <button
              onClick={() => setStep('email')}
              style={{
                marginTop: '1rem', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--mist)', transition: 'color var(--duration)',
              }}
              onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseOut={e => (e.currentTarget.style.color = 'var(--mist)')}
            >
              ← Change email
            </button>
          </>
        )}

        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div className="spinner" style={{ margin: '0 auto 1.25rem' }} />
            <h2 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '0.4rem' }}>
              Confirming payment…
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--mist)' }}>Please do not close this window.</p>
          </div>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(196, 134, 42, 0.1)', border: '1px solid var(--gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem', fontSize: '1.5rem', color: 'var(--gold)',
            }}>✓</div>
            <span className="eyebrow" style={{ marginBottom: '0.4rem' }}>Payment confirmed</span>
            <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '0.4rem' }}>
              Your audiobook is ready
            </h2>
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--mist)', marginBottom: '1.5rem' }}>
              {book.title}
            </p>
            <button
              className="btn btn--primary"
              onClick={() => { onClose(); onSuccess() }}
              style={{ width: '100%' }}
            >
              Start Listening →
            </button>
          </div>
        )}

        {step === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(192, 57, 43, 0.07)', border: '1px solid rgba(192, 57, 43, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem', fontSize: '1.3rem', color: '#c0392b',
            }}>!</div>
            <h2 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '0.5rem' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--mist)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              {errorMsg || 'An unexpected error occurred.'}
            </p>
            <button
              className="btn btn--primary"
              onClick={() => { setErrorMsg(''); setStep('email') }}
              style={{ width: '100%' }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── BookDetail page ──────────────────────────────────────────────────────────
export default function BookDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showSampleModal, setShowSampleModal] = useState(false)
  const [showAudioPurchaseModal, setShowAudioPurchaseModal] = useState(false)
  const [audiobookChapters, setAudiobookChapters] = useState<AudioChapter[]>([])
  const { books, loading } = useBooks()
  const { user, session } = useAuth()

  const fetchAudiobookAccess = async (accessToken: string, bookSlug: string) => {
    try {
      const res = await fetch('/api/my-library', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const entry = (data.audiobookAccess ?? []).find(
        (a: { slug: string }) => a.slug === bookSlug
      )
      if (entry?.chapters?.length > 0) {
        setAudiobookChapters(entry.chapters as AudioChapter[])
      }
    } catch {
      // not logged in or no purchase — silent
    }
  }

  useEffect(() => {
    if (session?.access_token && slug) {
      fetchAudiobookAccess(session.access_token, slug)
    }
  }, [session?.access_token, slug]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div style={{ padding: '8rem 0', textAlign: 'center', color: 'var(--mist)', fontSize: '0.82rem', letterSpacing: '0.1em' }}>
        Loading…
      </div>
    )
  }

  const book = books.find(b => b.slug === (slug || ''))
  if (!book) return <Navigate to="/catalogue" replace />

  const author = getPenNameById(book.penNameId)
  const moreBooks = books
    .filter(b => book.penNameId && b.penNameId === book.penNameId && b.id !== book.id)
    .slice(0, 4)
  const moreBooksIds = new Set(moreBooks.map(b => b.id))
  const similarBooks = books
    .filter(b => b.genre.toLowerCase() === book.genre.toLowerCase() && b.id !== book.id && !moreBooksIds.has(b.id))
    .slice(0, 3)
  const accent = book.coverAccent ?? '#c8911f'

  return (
    <div style={{ padding: '2rem 0 5rem' }}>
      <Helmet>
        <title>{book.title} | Orizon Press</title>
        <meta name="description" content={book.description} />
        <meta property="og:title" content={`${book.title} | Orizon Press`} />
        <meta property="og:description" content={book.description} />
        <meta property="og:type" content="book" />
        <meta property="og:url" content={`https://orizonpress.com/books/${book.slug}`} />
      </Helmet>

      <div className="container">
        <Link
          to="/catalogue"
          style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mist)', display: 'inline-block', marginBottom: '2.5rem', transition: 'color var(--duration)' }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--mist)')}
        >
          ← Back to Catalogue
        </Link>

        <div className="book-detail-grid">
          {/* Cover + Buy */}
          <div className="book-detail-cover-col">
            <div style={{ aspectRatio: '2/3', background: book.coverColor, position: 'relative', overflow: 'hidden', marginBottom: '1.5rem', boxShadow: 'var(--shadow-mid)' }}>
              {book.coverImage ? (
                <img
                  src={book.coverImage}
                  alt={book.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: 16, left: 16, width: 22, height: 22, borderTop: `1px solid ${accent}`, borderLeft: `1px solid ${accent}` }} />
                  <span style={{ position: 'absolute', bottom: 16, right: 16, width: 22, height: 22, borderBottom: `1px solid ${accent}`, borderRight: `1px solid ${accent}` }} />
                  <span style={{ display: 'block', width: 32, height: 1, background: accent, marginBottom: 14, opacity: 0.9 }} />
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--parchment)', lineHeight: 1.3 }}>{book.title}</h3>
                  {book.subtitle && <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'rgba(244,239,230,0.6)', marginTop: '0.5rem', fontStyle: 'italic' }}>{book.subtitle}</p>}
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: accent, marginTop: '1rem', display: 'block' }}>{author?.name}</span>
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.07) 0, transparent 60%)', pointerEvents: 'none' }} />
                </div>
              )}
            </div>

            {/* Buy section */}
            <div style={{ border: '1px solid var(--border)', padding: '1.25rem', background: 'var(--parchment)' }}>
              <div style={{ fontSize: '0.62rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mist)', marginBottom: '1.25rem' }}>
                Get This Book
              </div>
              {book.ebook.available && (
                <div style={{ padding: '0.8rem 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: book.sampleText ? '0.6rem' : 0 }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mist)' }}>eBook</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--gold)', lineHeight: 1, marginTop: 2, display: 'block' }}>
                        ${book.ebook.price.toFixed(2)}
                      </span>
                    </div>
                    <button
                      className="btn btn--primary"
                      style={{ fontSize: '0.68rem' }}
                      onClick={() => setShowPurchaseModal(true)}
                    >
                      Buy eBook
                    </button>
                  </div>
                  {book.sampleText && (
                    <button
                      className="btn btn--outline"
                      style={{ width: '100%', fontSize: '0.68rem', marginTop: '0.25rem' }}
                      onClick={() => setShowSampleModal(true)}
                    >
                      Read Sample
                    </button>
                  )}
                </div>
              )}
              {book.print.available && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 0', borderTop: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mist)' }}>Paperback</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--gold)', lineHeight: 1, marginTop: 2, display: 'block' }}>
                      ${book.print.price.toFixed(2)}
                    </span>
                  </div>
                  <a
                    className="btn btn--outline"
                    style={{ fontSize: '0.68rem', textDecoration: 'none' }}
                    href={`https://www.amazon.com/s?k=${encodeURIComponent(book.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >Buy Print</a>
                </div>
              )}
              {book.audiobook?.available && book.audiobook.price !== null && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 0', borderTop: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mist)' }}>Audiobook</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--gold)', lineHeight: 1, marginTop: 2, display: 'block' }}>
                      ${book.audiobook.price.toFixed(2)}
                    </span>
                  </div>
                  {audiobookChapters.length > 0 ? (
                    <button
                      className="btn btn--outline"
                      style={{ fontSize: '0.68rem' }}
                      onClick={() => document.getElementById('audiobook-player')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      ▶ Listen Now
                    </button>
                  ) : (
                    <button
                      className="btn btn--outline"
                      style={{ fontSize: '0.68rem' }}
                      onClick={() => setShowAudioPurchaseModal(true)}
                    >
                      Buy Audiobook
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <span className="genre-tag active">{book.genre}</span>
              {author && (
                <Link
                  to={`/authors/${author.slug}`}
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontStyle: 'italic', color: 'var(--mist)', transition: 'color var(--duration)' }}
                  onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
                  onMouseOut={e => (e.currentTarget.style.color = 'var(--mist)')}
                >
                  {author.name}
                </Link>
              )}
            </div>

            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', marginBottom: '0.5rem' }}>{book.title}</h1>
            {book.subtitle && (
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontStyle: 'italic', color: 'var(--mist)', marginBottom: '2rem' }}>
                {book.subtitle}
              </p>
            )}

            <div style={{ marginBottom: '2rem' }}>
              <span className="rule" />
              <p style={{ lineHeight: 1.88 }}>{book.description}</p>
            </div>

            {book.tags && book.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
                {book.tags.map(tag => (
                  <span key={tag} style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', background: 'var(--parchment-mid)', color: 'var(--mist)', border: '1px solid var(--border)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {book.reviews && book.reviews.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                {book.reviews.map((r, i) => (
                  <blockquote key={i} style={{ borderLeft: '2px solid var(--gold)', paddingLeft: '1.25rem', marginBottom: '1.25rem' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1.65 }}>
                      "{r.text}"
                    </p>
                    <cite style={{ display: 'block', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mist)', marginTop: '0.5rem', fontStyle: 'normal' }}>
                      — {r.source}
                    </cite>
                  </blockquote>
                ))}
              </div>
            )}

            <ShareButtons
              url={`https://orizonpress.com/books/${book.slug}`}
              text={`"${book.title}"${author ? ` by ${author.name}` : ''} — Orizon Press`}
            />

            <ReviewSection bookSlug={book.slug} userEmail={user?.email ?? null} />
            {audiobookChapters.length > 0 && (
              <AudiobookPlayer chapters={audiobookChapters} />
            )}
          </div>
        </div>

        {/* More from author */}
        {moreBooks.length > 0 && (
          <div style={{ marginTop: '5rem', paddingTop: '3rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <span className="rule" />
              <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>Same Author</span>
              <h2 style={{ marginTop: '0.4rem' }}>More from {author?.name}</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '3rem 1.5rem' }}>
              {moreBooks.map((b, i) => <BookCard key={b.id} book={b} index={i} />)}
            </div>
          </div>
        )}

        {/* You Might Also Like */}
        {similarBooks.length > 0 && (
          <div style={{ marginTop: '5rem', paddingTop: '3rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <span className="rule" />
              <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>You Might Also Like</span>
              <h2 style={{ marginTop: '0.4rem' }}>{book.genre}</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '3rem 1.5rem' }}>
              {similarBooks.map((b, i) => <BookCard key={b.id} book={b} index={i} />)}
            </div>
          </div>
        )}
      </div>

      {/* Sample modal */}
      {showSampleModal && (
        <SampleModal
          book={book}
          onClose={() => setShowSampleModal(false)}
          onBuy={() => { setShowSampleModal(false); setShowPurchaseModal(true) }}
        />
      )}

      {/* Purchase modal */}
      {showPurchaseModal && (
        <EbookPurchaseModal
          book={book}
          onClose={() => setShowPurchaseModal(false)}
        />
      )}

      {/* Audiobook purchase modal */}
      {showAudioPurchaseModal && book.audiobook?.available && (
        <AudiobookPurchaseModal
          book={book}
          onClose={() => setShowAudioPurchaseModal(false)}
          onSuccess={() => {
            if (session?.access_token && slug) {
              fetchAudiobookAccess(session.access_token, slug).then(() => {
                setTimeout(
                  () => document.getElementById('audiobook-player')?.scrollIntoView({ behavior: 'smooth' }),
                  100,
                )
              })
            }
          }}
        />
      )}
    </div>
  )
}
