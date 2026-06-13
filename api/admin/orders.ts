import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/admin-auth.js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return
  if (req.method !== 'GET') return res.status(405).end()

  const [ordersResult, booksResult, penNamesResult] = await Promise.all([
    supabase
      .from('orders')
      .select('paypal_order_id, buyer_email, book_slug, book_title, amount, order_type, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('books').select('slug, pen_name_id'),
    supabase.from('pen_names').select('id, name'),
  ])

  if (ordersResult.error) return res.status(500).json({ error: ordersResult.error.message })

  const bookPenMap = Object.fromEntries(
    (booksResult.data ?? []).map(b => [b.slug, b.pen_name_id])
  )
  const penNameMap = Object.fromEntries(
    (penNamesResult.data ?? []).map(p => [p.id, p.name])
  )

  const orders = (ordersResult.data ?? []).map(o => ({
    ...o,
    pen_name: penNameMap[bookPenMap[o.book_slug]] ?? null,
  }))

  return res.status(200).json(orders)
}
