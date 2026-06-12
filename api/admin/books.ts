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
      .from('books')
      .select('id, slug, title, author, genre, available, pdf_path, epub_path, cover_url, price, created_at, audio_price, audio_available, audio_chapters, description, short_description, tagline')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data ?? [])
  }

  if (req.method === 'PATCH') {
    const { slug, ...updates } = req.body ?? {}
    if (!slug) return res.status(400).json({ error: 'slug required' })

    const { data, error } = await supabase
      .from('books')
      .update(updates)
      .eq('slug', slug)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'DELETE') {
    const { slug } = req.body ?? {}
    if (!slug) return res.status(400).json({ error: 'slug required' })

    const { data: book, error: fetchErr } = await supabase
      .from('books')
      .select('pdf_path, epub_path')
      .eq('slug', slug)
      .single()

    if (fetchErr || !book) return res.status(404).json({ error: 'Book not found' })

    // Delete storage files — best effort, don't fail the whole request
    const ebookFiles: string[] = []
    if (book.pdf_path) ebookFiles.push(book.pdf_path)
    if (book.epub_path) ebookFiles.push(book.epub_path)
    if (ebookFiles.length > 0) {
      await supabase.storage.from('ebooks').remove(ebookFiles)
    }
    await supabase.storage.from('covers').remove([`${slug}.png`, `${slug}.jpg`, `${slug}.webp`])

    const { error: delError } = await supabase.from('books').delete().eq('slug', slug)
    if (delError) return res.status(500).json({ error: delError.message })

    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
