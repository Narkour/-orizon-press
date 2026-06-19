import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from './_lib/rate-limit.js'
import { setCors, handleOptions } from './_lib/cors.js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const BASE_URL = 'https://orizonpress.com'
const STATIC_PAGES = [
  { loc: '/',          priority: '1.0', changefreq: 'weekly' },
  { loc: '/catalogue', priority: '0.9', changefreq: 'weekly' },
  { loc: '/authors',   priority: '0.8', changefreq: 'weekly' },
  { loc: '/blog',      priority: '0.7', changefreq: 'weekly' },
  { loc: '/about',     priority: '0.6', changefreq: 'monthly' },
  { loc: '/contact',   priority: '0.5', changefreq: 'monthly' },
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (!handleOptions(req, res)) return

  // Newsletter subscription: POST /api/books  { resource: 'subscribe', email }
  if (req.method === 'POST') {
    if (!rateLimit(req, res, { limit: 5, windowMs: 60_000, label: 'subscribe' })) return
    const { resource, email } = req.body ?? {}
    if (resource !== 'subscribe') return res.status(400).json({ error: 'Unknown resource' })
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' })
    }
    const { error } = await supabase
      .from('subscribers')
      .upsert({ email: email.toLowerCase().trim() }, { onConflict: 'email', ignoreDuplicates: true })
    if (error) {
      if (error.code === '42P01') return res.status(503).json({ error: 'newsletter_not_configured' })
      console.error('[subscribe]', error)
      return res.status(500).json({ error: 'Subscription failed. Please try again.' })
    }
    return res.status(200).json({ ok: true })
  }

  if (req.method !== 'GET') return res.status(405).end()
  if (!rateLimit(req, res, { limit: 60, windowMs: 60_000, label: 'books' })) return

  // Sitemap: GET /api/books?format=sitemap  (served at /sitemap.xml via rewrite)
  if (req.query.format === 'sitemap') {
    const today = new Date().toISOString().slice(0, 10)
    const [booksRes, pensRes] = await Promise.all([
      supabase.from('books').select('slug, updated_at, created_at').eq('available', true).order('created_at', { ascending: false }),
      supabase.from('pen_names').select('slug'),
    ])
    const urls: string[] = []
    for (const p of STATIC_PAGES) {
      urls.push(`\n  <url><loc>${BASE_URL}${p.loc}</loc><lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`)
    }
    for (const b of booksRes.data ?? []) {
      const lastmod = (b.updated_at ?? b.created_at ?? today).slice(0, 10)
      urls.push(`\n  <url><loc>${BASE_URL}/books/${b.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`)
    }
    for (const p of pensRes.data ?? []) {
      urls.push(`\n  <url><loc>${BASE_URL}/authors/${p.slug}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`)
    }
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}\n</urlset>`)
  }

  // RSS feed: GET /api/books?format=rss  (served at /rss.xml via rewrite)
  if (req.query.format === 'rss') {
    const POSTS = [
      { slug: 'romance-novels-why-we-need-love-stories', title: 'Why We All Need a Great Love Story: The Power of Romance Novels', excerpt: "Romance fiction is the world's most popular literary genre, outselling every other category of fiction.", author: 'Ajona Penhart', date: '2026-06-07', category: 'Romance' },
      { slug: 'six-more-african-articles-ori-wisdom-daily-life', title: 'How Ancient Ori Wisdom Can Transform Your Daily Life Today', excerpt: 'The Ori principle is not a relic of antiquity. It is a living framework for navigating the decisions, relationships, and purpose questions that define your daily existence.', author: 'JOJO Penwood', date: '2026-06-06', category: 'African Spirituality & Consciousness' },
      { slug: 'african-pharaohs-nubian-queens-forgotten-rulers', title: 'Nubian Queens and Forgotten African Rulers Who Changed History', excerpt: 'Amanirenas forced Rome to negotiate as an equal. Nzinga fought the Portuguese for thirty years and never surrendered.', author: 'J.N. Nartey', date: '2026-06-04', category: 'African History' },
      { slug: 'ubuntu-philosophy-community-healing', title: 'Ubuntu: The African Philosophy the World Desperately Needs Right Now', excerpt: 'Ubuntu — "I am because we are" — is not a motivational slogan. It is one of the most rigorous ethical frameworks in human history.', author: 'JOJO Penwood', date: '2026-06-02', category: 'African Spirituality & Consciousness' },
      { slug: 'ori-principle-yoruba-divine-consciousness', title: 'The Ori Principle: Understanding Your Divine Consciousness in Yoruba Tradition', excerpt: 'In Yoruba cosmology, Ori is not a metaphor. It is the living divine consciousness seated within every human being.', author: 'JOJO Penwood', date: '2026-06-01', category: 'African Spirituality' },
      { slug: 'courtroom-drama-legal-thrillers-why-addictive', title: 'Why Courtroom Drama and Legal Thrillers Are So Addictive', excerpt: 'The courtroom is a theatre where two narratives compete before an audience tasked with judging not truth but the more compelling story.', author: 'JOJO Penwood', date: '2026-05-30', category: 'Crime & Thriller' },
      { slug: 'trans-atlantic-slave-trade-untold-stories', title: 'The Trans-Atlantic Slave Trade: Stories History Books Left Out', excerpt: 'The standard account frames the enslaved as passive sufferers. What it erases is extraordinary: the resistance, the rebellion, the cultural preservation.', author: 'J.N. Nartey', date: '2026-05-25', category: 'African History' },
      { slug: 'biblical-wisdom-modern-world-ancient-texts', title: 'Ancient Biblical Wisdom for the Modern World: What We Are Missing', excerpt: 'The Bible is among the most read texts in human history and among the least deeply engaged.', author: 'J.N. Nartey', date: '2026-05-22', category: 'Religion & Spirituality' },
      { slug: 'ancient-african-pharaohs-hidden-history', title: 'Ancient African Pharaohs You Were Never Taught in School', excerpt: 'For a remarkable period, Egypt was ruled by kings from deep in the African continent — Nubian pharaohs who unified the Nile Valley.', author: 'J.N. Nartey', date: '2026-05-20', category: 'African History' },
      { slug: 'african-cosmos-stars-astronomy-ancestors', title: 'The African Cosmos: How Our Ancestors Read the Stars', excerpt: 'Long before European observatories turned their instruments toward the sky, African astronomers had been reading the heavens for millennia.', author: 'JOJO Penwood', date: '2026-05-18', category: 'African Spirituality & Consciousness' },
      { slug: 'self-help-books-abundance-mindset-transformation', title: 'The Abundance Mindset: How the Right Books Can Transform Your Life', excerpt: 'The distinction between scarcity and abundance thinking sounds like motivational-poster language. Beneath it lies a well-supported claim about human cognition.', author: 'J.N. Nartey', date: '2026-05-12', category: 'Self-Help & Personal Growth' },
      { slug: 'why-african-fiction-matters-now', title: 'Why African Fiction Is the Most Powerful Literature of Our Time', excerpt: 'The stories being written in Lagos and Nairobi, in Accra and Dakar, are not additions to world literature. They are world literature.', author: 'JOJO Penwood', date: '2026-05-10', category: 'Fiction' },
      { slug: 'ghana-empire-mali-songhai-great-african-kingdoms', title: 'Ghana, Mali, Songhai: The Great African Kingdoms You Should Know', excerpt: 'Before the Italian Renaissance, three successive West African empires ruled territories larger than most of Europe.', author: 'J.N. Nartey', date: '2026-05-08', category: 'African History' },
    ]
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const sorted = [...POSTS].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const items = sorted.map(p => `
    <item>
      <title>${esc(p.title)}</title>
      <link>${BASE_URL}/blog/${p.slug}</link>
      <description>${esc(p.excerpt)}</description>
      <author>${esc(p.author)}</author>
      <pubDate>${new Date(p.date + 'T12:00:00Z').toUTCString()}</pubDate>
      <guid isPermaLink="true">${BASE_URL}/blog/${p.slug}</guid>
      <category>${esc(p.category)}</category>
    </item>`).join('')
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>Orizon Press</title>\n    <link>${BASE_URL}</link>\n    <description>Independent publisher of African history, consciousness, spirituality and fiction.</description>\n    <language>en</language>\n    <lastBuildDate>${new Date(sorted[0].date + 'T12:00:00Z').toUTCString()}</lastBuildDate>\n    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>\n    <image><url>${BASE_URL}/icons/icon-512.png</url><title>Orizon Press</title><link>${BASE_URL}</link></image>${items}\n  </channel>\n</rss>`
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).send(xml)
  }

  // Pen-names sub-resource: GET /api/books?resource=pen-names
  if (req.query.resource === 'pen-names') {
    const { data, error } = await supabase
      .from('pen_names')
      .select('id, slug, name, bio, short_bio, genres, accent_color')
      .order('name')
    if (error) {
      console.error('[/api/books?resource=pen-names]', error)
      return res.status(200).json([])
    }
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json(data ?? [])
  }

  const [booksResult, configBlob] = await Promise.all([
    supabase.from('books').select('*').eq('available', true).order('created_at', { ascending: true }),
    supabase.storage.from('ebooks').download('_config.json').catch(() => null),
  ])

  if (booksResult.error) {
    console.error('[/api/books]', booksResult.error)
    return res.status(500).json({ error: booksResult.error.message })
  }

  const bookList = booksResult.data ?? []

  // Determine featured book: manual pin takes priority, otherwise daily rotation
  let featuredSlug: string | null = null
  if (configBlob?.data) {
    try {
      const cfg = JSON.parse(await (configBlob.data as Blob).text())
      if (cfg.pinned && cfg.featuredSlug) {
        featuredSlug = cfg.featuredSlug
      }
    } catch {}
  }
  if (!featuredSlug && bookList.length > 0) {
    // Rotate daily: days since Unix epoch mod number of books — same for every visitor
    const dayIndex = Math.floor(Date.now() / 86_400_000)
    featuredSlug = bookList[dayIndex % bookList.length].slug
  }

  const books = bookList.map(b => ({ ...b, featured: b.slug === featuredSlug }))
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  return res.status(200).json(books)
}
