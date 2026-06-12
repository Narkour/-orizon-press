import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { rateLimit } from './_lib/rate-limit.js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const TOKEN_EXPIRY_HOURS = 24

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 10 re-download requests per IP per hour
  if (!rateLimit(req, res, { limit: 10, windowMs: 60 * 60_000, label: 'redownload' })) return

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user?.email) {
    return res.status(401).json({ error: 'Invalid session' })
  }

  const { bookSlug } = req.body ?? {}
  if (!bookSlug || typeof bookSlug !== 'string') {
    return res.status(400).json({ error: 'Missing bookSlug' })
  }

  // Verify the user actually purchased this book
  const { data: order, error: lookupError } = await supabase
    .from('orders')
    .select('id')
    .eq('buyer_email', user.email)
    .eq('book_slug', bookSlug)
    .limit(1)
    .single()

  if (lookupError || !order) {
    return res.status(403).json({ error: 'No purchase found for this book' })
  }

  // Issue a fresh download token
  const downloadToken = randomUUID()
  const tokenExpiresAt = new Date(
    Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString()

  // Store the new token in a new orders row so download-ebook can look it up
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
    console.error('[request-redownload] DB error:', insertError)
    return res.status(500).json({ error: 'Failed to prepare download' })
  }

  return res.status(200).json({ downloadToken, expiresAt: tokenExpiresAt })
}
