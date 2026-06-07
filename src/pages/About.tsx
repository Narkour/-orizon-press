import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

export default function About() {
  return (
    <div style={{ padding:'3rem 0 6rem' }}>
      <Helmet>
        <title>About Orizon Press | Independent African Publisher</title>
        <meta name="description" content="Orizon Press is an independent publishing house dedicated to African stories, history and consciousness." />
        <meta property="og:title" content="About Orizon Press | Independent African Publisher" />
        <meta property="og:description" content="Orizon Press is an independent publishing house dedicated to African stories, history and consciousness." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://orizonpress.com/about" />
      </Helmet>
      <div className="container">
        <div style={{ padding:'2rem 0 3rem', maxWidth:600 }}>
          <span className="rule" />
          <span className="eyebrow" style={{ marginBottom:'0.5rem' }}>Our Story</span>
          <h1 style={{ marginTop:'0.4rem' }}>About Orizon Press</h1>
        </div>

        <div style={{ maxWidth:680 }}>
          <p style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.1rem, 2vw, 1.35rem)', lineHeight:1.72, color:'var(--ink)', fontWeight:300, marginBottom:'3rem' }}>
            Orizon Press is an independent publisher dedicated to works that reach
            beyond the horizon of conventional thought — books that illuminate
            African intellectual heritage, expand consciousness, and tell stories
            that have not been told before.
          </p>

          {[
            { title:'What We Publish', body:'Our catalogue spans African history and philosophy, consciousness studies, spirituality, literary fiction, Christian devotional works, and educational texts. Each title is chosen for its depth, originality, and potential to genuinely shift the reader\'s understanding of themselves and the world.' },
            { title:'Where We Reach', body:'Orizon Press titles are available directly through this store and through major retailers in the United States, Canada, the United Kingdom, and across Europe. Our distribution network includes Apple Books, Google Play, Kobo, Barnes & Noble, OverDrive library systems, and Amazon Kindle.' },
            { title:'The Name', body:'Orizon combines two ideas: the universal concept of the horizon — the line where the known world meets the yet-to-be-discovered — and Ori, the Yoruba concept of the personal divine consciousness, the highest self. Every book we publish is an act of reaching toward that meeting point.' },
          ].map(({ title, body }) => (
            <div key={title} style={{ marginBottom:'2.5rem' }}>
              <h2 style={{ fontSize:'1.5rem', marginBottom:'0.8rem' }}>{title}</h2>
              <p style={{ lineHeight:1.85 }}>{body}</p>
            </div>
          ))}

          <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', marginTop:'3rem', paddingTop:'2.5rem', borderTop:'1px solid var(--border)' }}>
            <Link to="/catalogue" className="btn btn--primary">Explore the Catalogue</Link>
            <Link to="/authors" className="btn btn--outline">Meet the Authors</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
