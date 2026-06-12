import { useState, useEffect } from 'react'

interface Review {
  id: string
  reviewer_name: string
  rating: number
  body: string
  verified_purchase: boolean
  created_at: string
}

function Stars({
  rating,
  size = 15,
  interactive = false,
  onRate,
}: {
  rating: number
  size?: number
  interactive?: boolean
  onRate?: (r: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <span style={{ display: 'inline-flex', gap: 2, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          onClick={() => interactive && onRate?.(i)}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          style={{
            fontSize: size,
            cursor: interactive ? 'pointer' : 'default',
            color: i <= (hover || rating) ? 'var(--gold)' : 'rgba(26,20,16,0.2)',
            transition: 'color 120ms',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          ★
        </span>
      ))}
    </span>
  )
}

export { Stars }

export default function ReviewSection({
  bookSlug,
  userEmail,
}: {
  bookSlug: string
  userEmail?: string | null
}) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState(userEmail ?? '')
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')

  useEffect(() => {
    if (userEmail) setEmail(userEmail)
  }, [userEmail])

  useEffect(() => {
    fetch(`/api/reviews?bookSlug=${encodeURIComponent(bookSlug)}`)
      .then(r => r.json())
      .then(data => setReviews(data.reviews ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [bookSlug])

  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    if (!rating) {
      setSubmitError('Please select a star rating.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookSlug,
          reviewerName: name,
          reviewerEmail: email,
          rating,
          body,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Submission failed.')
      setReviews(prev => [data.review, ...prev])
      setSubmitted(true)
      setShowForm(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ marginTop: '3.5rem', paddingTop: '2.5rem', borderTop: '1px solid var(--border)' }}>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <span className="rule" />
          <span className="eyebrow" style={{ marginBottom: '0.4rem' }}>Reader Reviews</span>
          {!loading && reviews.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Stars rating={Math.round(avg)} size={14} />
              <span style={{ fontSize: '0.78rem', color: 'var(--mist)' }}>
                {avg.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        {!submitted && !showForm && (
          <button
            className="btn btn--outline"
            style={{ fontSize: '0.68rem' }}
            onClick={() => setShowForm(true)}
          >
            Write a Review
          </button>
        )}
      </div>

      {/* Submission success */}
      {submitted && (
        <div
          style={{
            padding: '0.9rem 1.1rem',
            background: 'rgba(46,125,50,0.07)',
            border: '1px solid rgba(46,125,50,0.3)',
            fontSize: '0.85rem',
            marginBottom: '2rem',
            color: '#2e7d32',
          }}
        >
          Thank you — your review has been posted.
        </div>
      )}

      {/* Review form */}
      {showForm && !submitted && (
        <div
          style={{
            border: '1px solid var(--border)',
            padding: '1.5rem',
            marginBottom: '2rem',
            background: 'var(--parchment)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              fontWeight: 500,
              marginBottom: '1.25rem',
            }}
          >
            Your Review
          </div>
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '1rem',
              }}
            >
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={inputStyle}
                  placeholder="Your name"
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                  placeholder="your@email.com"
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Rating</label>
              <Stars rating={rating} size={26} interactive onRate={setRating} />
            </div>

            <div>
              <label style={labelStyle}>Review</label>
              <textarea
                required
                value={body}
                onChange={e => setBody(e.target.value)}
                style={{ ...inputStyle, height: 110, resize: 'vertical' }}
                placeholder="Share your thoughts on this book…"
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            {submitError && (
              <p style={{ fontSize: '0.8rem', color: '#c0392b' }}>{submitError}</p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="submit"
                className="btn btn--primary"
                style={{ fontSize: '0.72rem' }}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
              <button
                type="button"
                className="btn btn--outline"
                style={{ fontSize: '0.72rem' }}
                onClick={() => { setShowForm(false); setSubmitError('') }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <p style={{ color: 'var(--mist)', fontSize: '0.82rem' }}>Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p style={{ color: 'var(--mist)', fontSize: '0.85rem', lineHeight: 1.75 }}>
          No reviews yet. Be the first to share your thoughts.
        </p>
      ) : (
        <div>
          {reviews.map(r => (
            <div
              key={r.id}
              style={{
                paddingTop: '1.5rem',
                paddingBottom: '1.5rem',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '0.6rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'var(--ink)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.85rem',
                      color: 'var(--parchment)',
                      flexShrink: 0,
                    }}
                  >
                    {r.reviewer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                      {r.reviewer_name}
                    </span>
                    {r.verified_purchase && (
                      <span
                        style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.58rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'var(--gold)',
                          border: '1px solid rgba(196,134,42,0.4)',
                          padding: '1px 5px',
                        }}
                      >
                        Verified
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Stars rating={r.rating} size={13} />
                  <span style={{ fontSize: '0.68rem', color: 'var(--mist)' }}>
                    {new Date(r.created_at).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--ink)' }}>
                {r.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  fontFamily: 'var(--font-body)',
  fontSize: '0.88rem',
  padding: '0.6rem 0.9rem',
  background: 'white',
  color: 'var(--ink)',
  border: '1px solid var(--border)',
  outline: 'none',
  transition: 'border-color var(--duration)',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.62rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--mist)',
  marginBottom: '0.35rem',
}
