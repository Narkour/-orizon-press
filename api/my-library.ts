import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { rateLimit } from './_lib/rate-limit.js'
import { setCorsRestricted, handleOptions } from './_lib/cors.js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const TOKEN_EXPIRY_HOURS = 24

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsRestricted(res)
  if (!handleOptions(req, res)) return

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user?.email) return res.status(401).json({ error: 'Invalid session' })

  // GET — fetch purchase history
  if (req.method === 'GET') {
    if (!rateLimit(req, res, { limit: 30, windowMs: 60 * 60_000, label: 'my-library' })) return

    const { data: allOrders, error: dbError } = await supabase
      .from('orders')
      .select('id, book_slug, book_title, amount, created_at, order_type')
      .eq('buyer_email', user.email)
      .order('created_at', { ascending: false })

    if (dbError) {
      console.error('[my-library] DB error:', dbError)
      return res.status(500).json({ error: 'Failed to fetch library' })
    }

    const rows = allOrders ?? []
    const ebookOrders = rows.filter(o => !o.order_type || o.order_type === 'ebook')
    const audiobookSlugs = [
      ...new Set(
        rows
          .filter(o => o.order_type === 'audiobook')
          .map(o => o.book_slug as string)
      ),
    ]

    let audiobookAccess: Array<{ slug: string; title: string; chapters: object[] }> = []
    if (audiobookSlugs.length > 0) {
      const { data: audioBooks } = await supabase
        .from('books')
        .select('slug, title, audio_chapters')
        .in('slug', audiobookSlugs)
      audiobookAccess = (audioBooks ?? []).map(b => ({
        slug: b.slug as string,
        title: b.title as string,
        chapters: (b.audio_chapters as object[]) ?? [],
      }))
    }

    return res.status(200).json({ orders: ebookOrders, audiobookAccess })
  }

  // POST — issue a fresh re-download token
  if (req.method === 'POST') {
    if (!rateLimit(req, res, { limit: 10, windowMs: 60 * 60_000, label: 'redownload' })) return

    const { bookSlug } = req.body ?? {}
    if (!bookSlug || typeof bookSlug !== 'string') {
      return res.status(400).json({ error: 'Missing bookSlug' })
    }

    const { data: order, error: lookupError } = await supabase
      .from('orders')
      .select('id, order_type')
      .eq('buyer_email', user.email)
      .eq('book_slug', bookSlug)
      .limit(1)
      .maybeSingle()

    if (lookupError || !order || order.order_type === 'audiobook') {
      return res.status(403).json({ error: 'No ebook purchase found for this book' })
    }

    const downloadToken = randomUUID()
    const tokenExpiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    ).toISOString()

    const { error: insertError } = await supabase.from('orders').insert({
      paypal_order_id: `redownload-${randomUUID()}`,
      buyer_email: user.email,
      book_slug: bookSlug,
      book_title: '',
      amount: 0,
      download_token: downloadToken,
      token_expires_at: tokenExpiresAt,
    })

    if (insertError) {
      console.error('[my-library] redownload error:', insertError)
      return res.status(500).json({ error: 'Failed to prepare download' })
    }

    return res.status(200).json({ downloadToken, expiresAt: tokenExpiresAt })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
