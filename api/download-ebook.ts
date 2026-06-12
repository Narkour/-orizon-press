import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from './_lib/rate-limit.js'
import { setCorsRestricted, handleOptions } from './_lib/cors.js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

// Signed URL valid for 5 minutes — long enough to start the download
const SIGNED_URL_TTL_SECONDS = 300

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsRestricted(res)
  if (!handleOptions(req, res)) return
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 20 download attempts per IP per hour
  if (!rateLimit(req, res, { limit: 20, windowMs: 60 * 60_000, label: 'download' })) return

  const { token } = req.query
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' })
  }

  // Look up the order by token
  const { data: order, error: lookupError } = await supabase
    .from('orders')
    .select('book_slug, token_expires_at, downloaded_at')
    .eq('download_token', token)
    .single()

  if (lookupError || !order) {
    return res.status(403).json({ error: 'Invalid download token' })
  }

  if (new Date(order.token_expires_at) < new Date()) {
    return res.status(403).json({ error: 'Download link has expired' })
  }

  // Generate signed URL for the ebook in Supabase Storage (bucket: ebooks)
  const filePath = `${order.book_slug}.pdf`
  const { data: signed, error: signError } = await supabase.storage
    .from('ebooks')
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS)

  if (signError || !signed?.signedUrl) {
    console.error('[download-ebook] Signed URL error:', signError)
    return res.status(500).json({ error: 'Failed to generate download link' })
  }

  // Record first-download timestamp (non-blocking — don't fail the response on error)
  if (!order.downloaded_at) {
    supabase
      .from('orders')
      .update({ downloaded_at: new Date().toISOString() })
      .eq('download_token', token)
      .then(({ error }) => {
        if (error) console.error('[download-ebook] Failed to mark downloaded:', error)
      })
  }

  return res.status(200).json({ url: signed.signedUrl })
}
