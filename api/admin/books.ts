import type { VercelRequest, VercelResponse } from '@vercel/node'
import type JSZipType from 'jszip'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/admin-auth.js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

function stripBase64Images(html: string): string {
  return html
    .replace(/<img[^>]+src="data:[^"]*"[^>]*\/?>/gi, '')
    .replace(/<img[^>]*>/gi, '')
}
function isImageFile(p: string) { return /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff?)$/i.test(p) }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return

  if (req.method === 'GET') {
    if (req.query.resource === 'featured-config') {
      const { data, error } = await supabase.storage.from('ebooks').download('_config.json')
      if (error || !data) return res.status(200).json({ featuredSlug: null, pinned: false })
      try {
        const cfg = JSON.parse(await (data as Blob).text())
        return res.status(200).json({ featuredSlug: cfg.featuredSlug ?? null, pinned: cfg.pinned ?? false })
      } catch {
        return res.status(200).json({ featuredSlug: null, pinned: false })
      }
    }

    // Orders for sales tracker: GET /api/admin/books?resource=orders
    if (req.query.resource === 'orders') {
      const [ordersResult, booksResult, penNamesResult] = await Promise.all([
        supabase.from('orders').select('paypal_order_id, buyer_email, book_slug, book_title, amount, order_type, created_at').order('created_at', { ascending: false }),
        supabase.from('books').select('slug, pen_name_id'),
        supabase.from('pen_names').select('id, name'),
      ])
      if (ordersResult.error) {
        console.error('[admin/orders] Supabase error:', ordersResult.error.message, ordersResult.error.code)
        return res.status(500).json({ error: ordersResult.error.message, code: ordersResult.error.code })
      }
      console.log('[admin/orders] row count:', ordersResult.data?.length ?? 0)
      const bookPenMap = Object.fromEntries((booksResult.data ?? []).map(b => [b.slug, b.pen_name_id]))
      const penNameMap = Object.fromEntries((penNamesResult.data ?? []).map(p => [p.id, p.name]))
      const orders = (ordersResult.data ?? []).map(o => ({ ...o, pen_name: penNameMap[bookPenMap[o.book_slug]] ?? null }))
      return res.status(200).json(orders)
    }

    if (req.query.resource === 'pen-names') {
      const { data, error } = await supabase
        .from('pen_names')
        .select('id, slug, name, bio, short_bio, genres, accent_color')
        .order('name')
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json(data ?? [])
    }

    const { data, error } = await supabase
      .from('books')
      .select('id, slug, title, author, genre, available, pdf_path, epub_path, cover_url, price, created_at, audio_price, audio_available, audio_chapters, description, short_description, tagline, sample_text')
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

  // EPUB compression: POST /api/admin/books  { resource:'compress-epub', slug }
  if (req.method === 'POST' && (req.body ?? {}).resource === 'compress-epub') {
    const { slug } = req.body ?? {}
    if (!slug) return res.status(400).json({ error: 'slug required' })
    const { data: book, error: bookErr } = await supabase.from('books').select('slug, title, epub_path').eq('slug', slug).single()
    if (bookErr || !book) return res.status(404).json({ error: 'Book not found' })

    // Resolve epub_path: if null, try the default slug.epub convention in storage
    let epubPath = book.epub_path
    if (!epubPath) {
      const fallback = `${slug}.epub`
      const { data: probe } = await supabase.storage.from('ebooks').download(fallback)
      if (!probe) return res.status(400).json({ error: 'No EPUB found in storage. Upload the manuscript again to generate one.' })
      await supabase.from('books').update({ epub_path: fallback }).eq('slug', slug)
      epubPath = fallback
    }

    const { data: fileData, error: dlErr } = await supabase.storage.from('ebooks').download(epubPath)
    if (dlErr || !fileData) return res.status(500).json({ error: `Download failed: ${dlErr?.message}` })
    const originalBytes = Buffer.from(await fileData.arrayBuffer())
    const originalMB = (originalBytes.length / 1024 / 1024).toFixed(2)
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(originalBytes)
    let removedImages = 0; let strippedMarkup = 0
    for (const [filePath, entry] of Object.entries(zip.files) as [string, JSZipType.JSZipObject][]) {
      if (entry.dir) continue
      if (isImageFile(filePath)) { zip.remove(filePath); removedImages++; continue }
      if (/\.(xhtml|html|htm|opf|ncx|xml)$/i.test(filePath)) {
        const content = await entry.async('string')
        const stripped = stripBase64Images(content)
        if (stripped !== content) { zip.file(filePath, stripped); strippedMarkup++ }
      }
    }
    const newBytes = (await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } })) as Buffer
    const newMB = (newBytes.length / 1024 / 1024).toFixed(2)
    const { error: upErr } = await supabase.storage.from('ebooks').upload(epubPath, newBytes, { contentType: 'application/epub+zip', upsert: true })
    if (upErr) return res.status(500).json({ error: `Re-upload failed: ${upErr.message}` })
    return res.status(200).json({ slug: book.slug, title: book.title, originalMB, compressedMB: newMB, savedMB: (parseFloat(originalMB) - parseFloat(newMB)).toFixed(2), removedImages, strippedMarkup })
  }

  // Featured book: POST /api/admin/books  { resource:'set-featured', slug }
  if (req.method === 'POST' && (req.body ?? {}).resource === 'set-featured') {
    const { slug } = req.body ?? {}
    if (!slug) return res.status(400).json({ error: 'slug required' })
    const cfg = Buffer.from(JSON.stringify({ featuredSlug: slug, pinned: true }))
    const { error } = await supabase.storage.from('ebooks').upload('_config.json', cfg, { contentType: 'application/json', upsert: true })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true, featuredSlug: slug, pinned: true })
  }

  // Clear pin (resume rotation): POST /api/admin/books  { resource:'clear-featured' }
  if (req.method === 'POST' && (req.body ?? {}).resource === 'clear-featured') {
    const cfg = Buffer.from(JSON.stringify({ pinned: false }))
    const { error } = await supabase.storage.from('ebooks').upload('_config.json', cfg, { contentType: 'application/json', upsert: true })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true, featuredSlug: null, pinned: false })
  }

  // Pen-name upsert: POST /api/admin/books  { resource:'pen-name', id, slug, name, ... }
  if (req.method === 'POST') {
    const { resource, id, slug, name, bio, short_bio, genres, accent_color } = req.body ?? {}
    if (resource !== 'pen-name') return res.status(400).json({ error: 'resource must be pen-name' })
    if (!id || !slug || !name) return res.status(400).json({ error: 'id, slug, name required' })

    const { data, error } = await supabase
      .from('pen_names')
      .upsert(
        {
          id, slug, name,
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
