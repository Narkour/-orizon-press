import type { VercelRequest, VercelResponse } from '@vercel/node'
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

function isImageFile(p: string): boolean {
  return /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff?)$/i.test(p)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return
  if (req.method !== 'POST') return res.status(405).end()

  const { slug } = req.body ?? {}
  if (!slug) return res.status(400).json({ error: 'slug required' })

  const { data: book, error: bookErr } = await supabase
    .from('books')
    .select('slug, title, epub_path')
    .eq('slug', slug)
    .single()

  if (bookErr || !book) return res.status(404).json({ error: 'Book not found' })
  if (!book.epub_path) return res.status(400).json({ error: 'Book has no epub_path' })

  const { data: fileData, error: dlErr } = await supabase.storage
    .from('ebooks')
    .download(book.epub_path)

  if (dlErr || !fileData) {
    return res.status(500).json({ error: `Download failed: ${dlErr?.message}` })
  }

  const originalBytes = Buffer.from(await fileData.arrayBuffer())
  const originalMB = (originalBytes.length / 1024 / 1024).toFixed(2)

  // JSZip dynamic import — available as a project dep
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(originalBytes)
  let removedImages = 0
  let strippedMarkup = 0

  for (const [filePath, entry] of Object.entries(zip.files)) {
    if ((entry as JSZip.JSZipObject).dir) continue
    if (isImageFile(filePath)) {
      zip.remove(filePath)
      removedImages++
      continue
    }
    if (/\.(xhtml|html|htm|opf|ncx|xml)$/i.test(filePath)) {
      const content = await (entry as JSZip.JSZipObject).async('string')
      const stripped = stripBase64Images(content)
      if (stripped !== content) { zip.file(filePath, stripped); strippedMarkup++ }
    }
  }

  const newBytes = (await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  })) as Buffer

  const newMB = (newBytes.length / 1024 / 1024).toFixed(2)

  const { error: upErr } = await supabase.storage
    .from('ebooks')
    .upload(book.epub_path, newBytes, { contentType: 'application/epub+zip', upsert: true })

  if (upErr) return res.status(500).json({ error: `Re-upload failed: ${upErr.message}` })

  return res.status(200).json({
    slug: book.slug,
    title: book.title,
    epub_path: book.epub_path,
    originalMB,
    compressedMB: newMB,
    savedMB: (parseFloat(originalMB) - parseFloat(newMB)).toFixed(2),
    removedImages,
    strippedMarkup,
  })
}
