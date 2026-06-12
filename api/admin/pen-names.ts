import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/admin-auth.js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('pen_names')
      .select('id, slug, name, bio, short_bio, genres, accent_color')
      .order('name')
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data ?? [])
  }

  if (req.method === 'POST') {
    const { id, slug, name, bio, short_bio, genres, accent_color } = req.body ?? {}
    if (!id || !slug || !name) return res.status(400).json({ error: 'id, slug, name required' })

    const { data, error } = await supabase
      .from('pen_names')
      .upsert(
        {
          id,
          slug,
          name,
          bio: bio || 'Bio coming soon.',
          short_bio: short_bio || 'A writer at Orizon Press.',
          genres: genres || [],
          accent_color: accent_color || '#8B7355',
        },
        { onConflict: 'id' }
      )
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).end()
}
