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
