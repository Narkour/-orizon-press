import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method === 'GET') {
    const { bookSlug } = req.query
    if (!bookSlug || typeof bookSlug !== 'string') {
      return res.status(400).json({ error: 'bookSlug required' })
    }

    const { data, error } = await supabase
      .from('reviews')
      .select('id, reviewer_name, rating, body, verified_purchase, created_at')
      .eq('book_slug', bookSlug)
      .eq('approved', true)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ reviews: data ?? [] })
  }

  if (req.method === 'POST') {
    const { bookSlug, reviewerName, reviewerEmail, rating, body } = req.body ?? {}

    if (!bookSlug || !reviewerName?.trim() || !reviewerEmail?.trim() || !rating || !body?.trim()) {
      return res.status(400).json({ error: 'All fields are required.' })
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1–5.' })
    }
    if (body.trim().length < 10) {
      return res.status(400).json({ error: 'Review must be at least 10 characters.' })
    }

    const email = reviewerEmail.trim().toLowerCase()

    // Prevent duplicate reviews from same email
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('book_slug', bookSlug)
      .eq('reviewer_email', email)
      .maybeSingle()

    if (existing) {
      return res.status(409).json({ error: 'You have already reviewed this book.' })
    }

    // Check for verified purchase
    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('buyer_email', email)
      .eq('book_slug', bookSlug)
      .maybeSingle()

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        book_slug: bookSlug,
        reviewer_name: reviewerName.trim(),
        reviewer_email: email,
        rating: Number(rating),
        body: body.trim(),
        verified_purchase: !!order,
        approved: true,
      })
      .select('id, reviewer_name, rating, body, verified_purchase, created_at')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ review: data })
  }

  return res.status(405).end()
}
