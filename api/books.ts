import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

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

  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[/api/books]', error)
    return res.status(500).json({ error: error.message })
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  return res.status(200).json(data ?? [])
}
