import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

export default function About() {
  return (
    <div style={{ padding: '3rem 0 6rem' }}>
      <Helmet>
        <title>About Orizon Press | Independent African Publisher</title>
        <meta name="description" content="Orizon Press is an independent publisher of African history, consciousness, spirituality, and literary fiction — named for Ori, the Yoruba concept of personal divine consciousness." />
        <meta property="og:title" content="About Orizon Press | Independent African Publisher" />
        <meta property="og:description" content="Orizon Press is an independent publisher of African history, consciousness, spirituality, and literary fiction — named for Ori, the Yoruba concept of personal divine consciousness." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://orizonpress.com/about" />
      </Helmet>
      <div className="container">
        <div style={{ padding: '2rem 0 3rem', maxWidth: 600 }}>
          <span className="rule" />
          <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>Our Story</span>
          <h1 style={{ marginTop: '0.4rem' }}>About Orizon Press</h1>
        </div>

        <div style={{ maxWidth: 700 }}>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
            lineHeight: 1.78,
            color: 'var(--ink)',
            fontWeight: 300,
            marginBottom: '3.5rem',
          }}>
            We are an independent publishing house built on a single conviction: that African thought,
            history, and imagination belong at the centre of world literature — not at its margins.
            Every book we publish is an act of reaching toward that horizon.
          </p>

          <div style={{ marginBottom: '2.75rem' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.9rem' }}>What We Publish</h2>
            <p style={{ lineHeight: 1.9, color: 'var(--ink)' }}>
              Our catalogue moves across African history, philosophy, and intellectual heritage;
              works of consciousness and personal transformation; spirituality rooted in both
              ancient African traditions and contemporary faith; and literary fiction that tells
              the stories this world has waited too long to read. We also publish Christian
              devotional works and educational texts where they meet the same standard of depth
              and originality. Each title is chosen because it has the power to genuinely shift
              a reader's understanding of themselves and the world they inhabit.
            </p>
          </div>

          <div style={{ marginBottom: '2.75rem' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.9rem' }}>Who We Are</h2>
            <p style={{ lineHeight: 1.9, color: 'var(--ink)' }}>
              Orizon Press is independent in the fullest sense — not a subsidiary, not
              backed by a conglomerate, not answerable to shareholders. That independence
              is the source of everything we do. It means we choose books because they matter,
              not because they are safe. It means our authors are partners. It means a reader
              who buys directly from us is supporting a publishing house that puts African
              voices at the heart of its mission, not as a category or a campaign,
              but as a founding principle.
            </p>
          </div>

          <div style={{ marginBottom: '2.75rem' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.9rem' }}>The Name</h2>
            <p style={{ lineHeight: 1.9, color: 'var(--ink)', marginBottom: '1rem' }}>
              <strong>Ori</strong> is a Yoruba concept: the personal divine consciousness that
              resides within each person — the highest self, the inner wisdom that guides a
              life toward its true purpose. It is not an external god to be appealed to, but
              the luminous intelligence already present inside you, waiting to be recognised.
            </p>
            <p style={{ lineHeight: 1.9, color: 'var(--ink)', marginBottom: '1rem' }}>
              <strong>Horizon</strong> is the line at the edge of the visible world — the place
              where the known ends and the yet-to-be-discovered begins. It moves as you move.
              It is never fixed. The horizon is not a boundary; it is an invitation.
            </p>
            <p style={{ lineHeight: 1.9, color: 'var(--ink)' }}>
              Together: <em>Orizon</em>. The point where your highest self meets the frontier
              of what is possible. That is the aspiration behind every book on our list —
              works that do not confirm what you already know, but call you toward
              something larger.
            </p>
          </div>

          <div style={{ marginBottom: '2.75rem' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.9rem' }}>Where We Reach</h2>
            <p style={{ lineHeight: 1.9, color: 'var(--ink)' }}>
              Orizon Press titles are available directly through this store — where every
              purchase supports the press most directly — and through major retailers worldwide.
              Our distribution network includes Apple Books, Google Play, Kobo, Barnes &amp; Noble,
              OverDrive library systems, and Amazon Kindle, reaching readers across the United
              States, Canada, the United Kingdom, Europe, and beyond. African stories deserve
              a global readership. We are building that audience, one reader at a time.
            </p>
          </div>

          <div style={{
            display: 'flex', gap: '1rem', flexWrap: 'wrap',
            marginTop: '3rem', paddingTop: '2.5rem',
            borderTop: '1px solid var(--border)',
          }}>
            <Link to="/catalogue" className="btn btn--primary">Explore the Catalogue</Link>
            <Link to="/authors" className="btn btn--outline">Meet the Authors</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
