import type { VercelRequest, VercelResponse } from '@vercel/node'

const BASE_URL = 'https://orizonpress.com'

interface PostMeta {
  slug: string
  title: string
  excerpt: string
  author: string
  date: string
  category: string
}

const POSTS: PostMeta[] = [
  { slug: 'romance-novels-why-we-need-love-stories', title: 'Why We All Need a Great Love Story: The Power of Romance Novels', excerpt: "Romance fiction is the world's most popular literary genre, outselling every other category of fiction. Understanding why reveals something essential about what stories are actually for.", author: 'Ajona Penhart', date: '2026-06-07', category: 'Romance' },
  { slug: 'six-more-african-articles-ori-wisdom-daily-life', title: 'How Ancient Ori Wisdom Can Transform Your Daily Life Today', excerpt: 'The Ori principle is not a relic of antiquity. It is a living framework for navigating the decisions, relationships, and purpose questions that define your daily existence.', author: 'JOJO Penwood', date: '2026-06-06', category: 'African Spirituality & Consciousness' },
  { slug: 'african-pharaohs-nubian-queens-forgotten-rulers', title: 'Nubian Queens and Forgotten African Rulers Who Changed History', excerpt: 'Amanirenas forced Rome to negotiate as an equal. Nzinga fought the Portuguese for thirty years and never surrendered. Yaa Asantewaa launched a war when no one else would.', author: 'J.N. Nartey', date: '2026-06-04', category: 'African History' },
  { slug: 'ubuntu-philosophy-community-healing', title: 'Ubuntu: The African Philosophy the World Desperately Needs Right Now', excerpt: 'Ubuntu — "I am because we are" — is not a motivational slogan. It is one of the most rigorous ethical frameworks in human history.', author: 'JOJO Penwood', date: '2026-06-02', category: 'African Spirituality & Consciousness' },
  { slug: 'ori-principle-yoruba-divine-consciousness', title: 'The Ori Principle: Understanding Your Divine Consciousness in Yoruba Tradition', excerpt: 'In Yoruba cosmology, Ori is not a metaphor. It is the living divine consciousness seated within every human being — your personal deity, your inner compass, and the ultimate arbiter of your destiny.', author: 'JOJO Penwood', date: '2026-06-01', category: 'African Spirituality' },
  { slug: 'courtroom-drama-legal-thrillers-why-addictive', title: 'Why Courtroom Drama and Legal Thrillers Are So Addictive', excerpt: 'The courtroom is a theatre where two narratives compete before an audience tasked with judging not truth — rarely fully available — but the more compelling story.', author: 'JOJO Penwood', date: '2026-05-30', category: 'Crime & Thriller' },
  { slug: 'trans-atlantic-slave-trade-untold-stories', title: 'The Trans-Atlantic Slave Trade: Stories History Books Left Out', excerpt: 'The standard account frames the enslaved as passive sufferers of an overwhelming historical crime. What it erases is extraordinary: the resistance, the rebellion, the cultural preservation.', author: 'J.N. Nartey', date: '2026-05-25', category: 'African History' },
  { slug: 'biblical-wisdom-modern-world-ancient-texts', title: 'Ancient Biblical Wisdom for the Modern World: What We Are Missing', excerpt: 'The Bible is among the most read texts in human history and among the least deeply engaged. Between devotional readings and culture-war deployments, something essential gets lost.', author: 'J.N. Nartey', date: '2026-05-22', category: 'Religion & Spirituality' },
  { slug: 'ancient-african-pharaohs-hidden-history', title: 'Ancient African Pharaohs You Were Never Taught in School', excerpt: 'For a remarkable period, Egypt was ruled by kings from deep in the African continent — Nubian pharaohs who unified the Nile Valley and defied the Assyrian empire.', author: 'J.N. Nartey', date: '2026-05-20', category: 'African History' },
  { slug: 'african-cosmos-stars-astronomy-ancestors', title: 'The African Cosmos: How Our Ancestors Read the Stars', excerpt: 'Long before European observatories turned their instruments toward the sky, African astronomers had been reading the heavens for millennia.', author: 'JOJO Penwood', date: '2026-05-18', category: 'African Spirituality & Consciousness' },
  { slug: 'self-help-books-abundance-mindset-transformation', title: 'The Abundance Mindset: How the Right Books Can Transform Your Life', excerpt: 'The distinction between scarcity and abundance thinking sounds like motivational-poster language. Beneath it lies a claim about human cognition that is well-supported by behavioural science.', author: 'J.N. Nartey', date: '2026-05-12', category: 'Self-Help & Personal Growth' },
  { slug: 'why-african-fiction-matters-now', title: 'Why African Fiction Is the Most Powerful Literature of Our Time', excerpt: 'The stories being written in Lagos and Nairobi, in Accra and Dakar, are not additions to world literature. They are world literature — engaging the defining questions of our century.', author: 'JOJO Penwood', date: '2026-05-10', category: 'Fiction' },
  { slug: 'ghana-empire-mali-songhai-great-african-kingdoms', title: 'Ghana, Mali, Songhai: The Great African Kingdoms You Should Know', excerpt: 'Before the Italian Renaissance, three successive West African empires ruled territories larger than most of Europe and administered trade networks that shaped the medieval global economy.', author: 'J.N. Nartey', date: '2026-05-08', category: 'African History' },
]

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function rfc2822(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00Z').toUTCString()
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const sorted = [...POSTS].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const items = sorted.map(p => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${BASE_URL}/blog/${p.slug}</link>
      <description>${escapeXml(p.excerpt)}</description>
      <author>${escapeXml(p.author)}</author>
      <pubDate>${rfc2822(p.date)}</pubDate>
      <guid isPermaLink="true">${BASE_URL}/blog/${p.slug}</guid>
      <category>${escapeXml(p.category)}</category>
    </item>`).join('')

  const lastBuild = rfc2822(sorted[0]?.date ?? new Date().toISOString().slice(0, 10))

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Orizon Press</title>
    <link>${BASE_URL}</link>
    <description>Independent publisher of African history, consciousness, spirituality and fiction.</description>
    <language>en</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${BASE_URL}/icons/icon-512.png</url>
      <title>Orizon Press</title>
      <link>${BASE_URL}</link>
    </image>${items}
  </channel>
</rss>`

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).send(xml)
}
