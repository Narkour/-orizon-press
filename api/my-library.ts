import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from './_lib/rate-limit.js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!rateLimit(req, res, { limit: 30, windowMs: 60 * 60_000, label: 'my-library' })) return

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user?.email) {
    return res.status(401).json({ error: 'Invalid session' })
  }

  const { data: orders, error: dbError } = await supabase
    .from('orders')
    .select('id, book_slug, book_title, amount, created_at')
    .eq('buyer_email', user.email)
    .order('created_at', { ascending: false })

  if (dbError) {
    console.error('[my-library] DB error:', dbError)
    return res.status(500).json({ error: 'Failed to fetch library' })
  }

  return res.status(200).json({ orders: orders ?? [] })
}
