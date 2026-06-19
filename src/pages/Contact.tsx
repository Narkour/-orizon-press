import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import emailjs from '@emailjs/browser'

const SERVICE_ID = 'service_ibbfjnr'
const TEMPLATE_ID = 'template_e4lau7r'
const PUBLIC_KEY = '52nkhjjmFHsAXPRWd'

type Fields = { name: string; email: string; subject: string; message: string }
type Errors = Partial<Fields>

export default function Contact() {
  const [form, setForm] = useState<Fields>({ name: '', email: '', subject: '', message: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [focused, setFocused] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [sendError, setSendError] = useState<boolean | null>(null)

  const validate = (): Errors => {
    const e: Errors = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address'
    if (!form.subject.trim()) e.subject = 'Subject is required'
    if (!form.message.trim()) e.message = 'Message is required'
    return e
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (errors[name as keyof Fields]) setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    setSendError(null)
    try {
      console.log('Sending with:', { serviceId: SERVICE_ID, templateId: TEMPLATE_ID })
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
        from_name: form.name,
        from_email: form.email,
        email: form.email,
        subject: form.subject,
        message: form.message,
        name: form.name,
      }, PUBLIC_KEY)
      setSubmitted(true)
    } catch (error) {
      console.error('EmailJS error:', JSON.stringify(error))
      setSendError(true)
    } finally {
      setSubmitting(false)
    }
  }

  const borderColor = (field: string) => {
    if (focused === field) return 'var(--gold)'
    if (errors[field as keyof Fields]) return '#6B1A1A'
    return 'var(--border)'
  }

  const inputBase: React.CSSProperties = {
    width: '100%',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    padding: '0.7rem 1rem',
    background: 'var(--parchment)',
    color: 'var(--ink)',
    outline: 'none',
    lineHeight: 1.5,
    transition: 'border-color 0.18s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.62rem',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--mist)',
    marginBottom: '0.5rem',
  }

  const errorStyle: React.CSSProperties = {
    marginTop: '0.35rem',
    fontSize: '0.75rem',
    color: '#6B1A1A',
  }

  if (submitted) {
    return (
      <div style={{ padding: '3rem 0 6rem' }}>
        <div className="container">
          <div style={{ maxWidth: 560, padding: '5rem 0 3rem' }}>
            <span style={{ color: 'var(--gold)', fontSize: '2rem', display: 'block', marginBottom: '1.5rem' }}>◈</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', lineHeight: 1.15, marginBottom: '1.2rem' }}>
              Message received.
            </h1>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.85, color: 'var(--mist)', maxWidth: '44ch' }}>
              Thank you for reaching out. We'll get back to you at{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{form.email}</strong>{' '}
              as soon as we can.
            </p>
            <button
              onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }) }}
              style={{
                marginTop: '2.5rem',
                padding: '0.85rem 2rem',
                background: 'transparent',
                color: 'var(--ink)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.8rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 600,
                border: '1px solid var(--ink)',
                cursor: 'pointer',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'var(--parchment)' }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink)' }}
            >
              Send another message
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '3rem 0 6rem' }}>
      <Helmet>
        <title>Contact | Orizon Press</title>
        <meta name="description" content="Get in touch with Orizon Press — independent publisher of African history, consciousness, spirituality, fiction, and Christian literature." />
        <meta property="og:title" content="Contact | Orizon Press" />
        <meta property="og:description" content="Get in touch with Orizon Press — independent publisher based in Ghana." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://orizonpress.com/contact" />
        <meta property="og:image" content="https://orizonpress.com/icons/icon-512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact | Orizon Press" />
        <meta name="twitter:description" content="Get in touch with Orizon Press — independent publisher of African history, consciousness, spirituality, and fiction." />
        <meta name="twitter:image" content="https://orizonpress.com/icons/icon-512.png" />
      </Helmet>

      <div className="container">
        <div style={{ padding: '2rem 0 3rem', maxWidth: 600 }}>
          <span className="rule" />
          <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>Get in Touch</span>
          <h1 style={{ marginTop: '0.4rem' }}>Contact Us</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,300px)', gap: '5rem', alignItems: 'start', maxWidth: 920 }}>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              <div>
                <label style={labelStyle}>Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  autoComplete="name"
                  style={{ ...inputBase, border: `1px solid ${borderColor('name')}` }}
                />
                {errors.name && <p style={errorStyle}>{errors.name}</p>}
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  autoComplete="email"
                  style={{ ...inputBase, border: `1px solid ${borderColor('email')}` }}
                />
                {errors.email && <p style={errorStyle}>{errors.email}</p>}
              </div>

              <div>
                <label style={labelStyle}>Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  onFocus={() => setFocused('subject')}
                  onBlur={() => setFocused(null)}
                  style={{ ...inputBase, border: `1px solid ${borderColor('subject')}` }}
                />
                {errors.subject && <p style={errorStyle}>{errors.subject}</p>}
              </div>

              <div>
                <label style={labelStyle}>Message</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  onFocus={() => setFocused('message')}
                  onBlur={() => setFocused(null)}
                  rows={8}
                  style={{ ...inputBase, border: `1px solid ${borderColor('message')}`, resize: 'vertical' }}
                />
                {errors.message && <p style={errorStyle}>{errors.message}</p>}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.85rem 2.5rem',
                    background: submitting ? 'var(--mist)' : 'var(--ink)',
                    color: 'var(--parchment)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    border: 'none',
                    cursor: submitting ? 'default' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => { if (!submitting) e.currentTarget.style.background = 'var(--gold)' }}
                  onMouseOut={e => { if (!submitting) e.currentTarget.style.background = 'var(--ink)' }}
                >
                  {submitting ? 'Sending…' : 'Send Message'}
                </button>
                {sendError && (
                  <p style={{ marginTop: '1rem', fontSize: '0.82rem', lineHeight: 1.6, color: '#6B1A1A' }}>
                    Something went wrong. Please try again or email us directly at hello@orizonpress.com.
                  </p>
                )}
              </div>

            </div>
          </form>

          <aside style={{ paddingTop: '0.25rem' }}>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.6rem' }}>
                Direct contact
              </div>
              <a
                href="mailto:hello@orizonpress.com"
                style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--ink)', textDecoration: 'none' }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
                onMouseOut={e => (e.currentTarget.style.color = 'var(--ink)')}
              >
                hello@orizonpress.com
              </a>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.6rem' }}>
                Based in
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.75, color: 'var(--mist)' }}>
                Accra, Ghana<br />Reaching readers globally
              </p>
            </div>

            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.85, color: 'var(--mist)', fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>
                "Independent. Global. Uncompromising."
              </p>
            </div>
          </aside>

        </div>
      </div>
    </div>
  )
}
