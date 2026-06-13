import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const BASE = 'https://orizonpress.com'
const TODAY = new Date().toISOString().slice(0, 10)

const STATIC_PAGES = [
  { loc: '/',          priority: '1.0', changefreq: 'weekly' },
  { loc: '/catalogue', priority: '0.9', changefreq: 'weekly' },
  { loc: '/authors',   priority: '0.8', changefreq: 'weekly' },
  { loc: '/blog',      priority: '0.7', changefreq: 'weekly' },
  { loc: '/about',     priority: '0.6', changefreq: 'monthly' },
  { loc: '/contact',   priority: '0.5', changefreq: 'monthly' },
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { data: books } = await supabase
    .from('books')
    .select('slug, updated_at, created_at')
    .eq('available', true)
    .order('created_at', { ascending: false })

  const { data: penNames } = await supabase
    .from('pen_names')
    .select('slug')

  const urls: string[] = []

  for (const page of STATIC_PAGES) {
    urls.push(`
  <url>
    <loc>${BASE}${page.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`)
  }

  for (const book of books ?? []) {
    const lastmod = (book.updated_at ?? book.created_at ?? TODAY).slice(0, 10)
    urls.push(`
  <url>
    <loc>${BASE}/books/${book.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`)
  }

  for (const pen of penNames ?? []) {
    urls.push(`
  <url>
    <loc>${BASE}/authors/${pen.slug}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}
</urlset>`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).send(xml)
}
