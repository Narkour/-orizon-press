import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import Busboy from 'busboy'
import mammoth from 'mammoth'
import { requireAdmin } from '../_lib/admin-auth.js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

interface ParsedFile { buffer: Buffer; filename: string; mimeType: string }

/** Parse multipart/form-data — returns all fields and named file buffers. */
function parseForm(req: VercelRequest): Promise<{
  fields: Record<string, string>
  files: Record<string, ParsedFile>
}> {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers })
    const fields: Record<string, string> = {}
    const files: Record<string, ParsedFile> = {}

    bb.on('field', (name, val) => { fields[name] = val })

    bb.on('file', (fieldName, stream, info) => {
      const chunks: Buffer[] = []
      stream.on('data', (d: Buffer) => chunks.push(d))
      stream.on('end', () => {
        files[fieldName] = {
          buffer: Buffer.concat(chunks),
          filename: info.filename,
          mimeType: info.mimeType,
        }
      })
    })

    bb.on('finish', () => {
      resolve({ fields, files })
    })

    bb.on('error', reject)

    req.on('data', (chunk: Buffer) => bb.write(chunk))
    req.on('end', () => bb.end())
    req.on('error', reject)
  })
}

/** Generate PDF bytes from extracted text using PDFKit directly. */
async function generatePdf(
  title: string,
  author: string,
  htmlContent: string
): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default

  // Strip HTML tags from mammoth output for clean text
  const plainText = htmlContent
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const paragraphs = plainText.split(/\n\n+/).filter(p => p.trim())

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A5',
      margins: { top: 72, bottom: 72, left: 54, right: 54 },
      autoFirstPage: true,
    })

    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Title page
    doc.moveDown(6)
    doc.fontSize(22).font('Times-Roman').text(title, { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(13).font('Helvetica').fillColor('#555555').text(author, { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(9).fillColor('#888888').text('Orizon Press', { align: 'center' })

    doc.addPage()

    // Body
    doc.fontSize(11).font('Times-Roman').fillColor('#1a1410')
    for (const para of paragraphs) {
      doc.text(para.trim(), { align: 'justify', lineGap: 4 })
      doc.moveDown(0.6)
    }

    doc.end()
  })
}

/** Generate EPUB bytes from extracted HTML. */
async function generateEpub(
  title: string,
  author: string,
  htmlContent: string,
  description: string
): Promise<Buffer> {
  const { default: JSZip } = await import('jszip')

  const zip = new JSZip()

  // mimetype must be first and uncompressed
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  zip.folder('META-INF')!.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)

  const oebps = zip.folder('OEBPS')!

  oebps.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:publisher>Orizon Press</dc:publisher>
    <dc:description>${description}</dc:description>
    <dc:language>en</dc:language>
    <dc:identifier id="uid">orizon-${Date.now()}</dc:identifier>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav"  href="nav.xhtml"     media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1"  href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="css"  href="style.css"      media-type="text/css"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>`)

  oebps.file('nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Table of Contents</title></head>
<body>
  <nav epub:type="toc">
    <ol><li><a href="chapter1.xhtml">${title}</a></li></ol>
  </nav>
</body>
</html>`)

  oebps.file('style.css', `
body { font-family: Georgia, serif; font-size: 1em; line-height: 1.6; margin: 1.5em; color: #1a1410; }
h1, h2, h3 { font-family: Georgia, serif; font-weight: normal; margin-top: 2em; }
p { margin: 0 0 1em; text-indent: 1.5em; }
p:first-of-type { text-indent: 0; }
`)

  oebps.file('chapter1.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
<h1>${title}</h1>
<p><em>${author}</em></p>
${htmlContent}
</body>
</html>`)

  return zip.generateAsync({ type: 'nodebuffer' })
}

/** Call Claude to generate BISAC codes, SEO keywords, description, tagline. */
async function generateMetadata(
  title: string,
  author: string,
  genre: string,
  extractedText: string
): Promise<{
  description: string
  shortDescription: string
  bisac: string[]
  seoKeywords: string[]
  tagline: string
}> {
  const preview = extractedText.slice(0, 3000)

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a publishing metadata specialist for Orizon Press, an independent publisher of African history, spirituality, consciousness, and fiction.

Book details:
- Title: ${title}
- Author: ${author}
- Genre: ${genre}
- Content preview: ${preview}

Generate the following metadata as JSON (no markdown, just the JSON object):
{
  "description": "Compelling 150-word sales description (no em dashes). Engage the reader, state the stakes, promise transformation or discovery.",
  "shortDescription": "One compelling sentence under 20 words.",
  "bisac": ["array of 3 BISAC subject codes, format: CATEGORY / Subcategory"],
  "seoKeywords": ["array of 8 SEO keyword phrases readers would search for"],
  "tagline": "Short punchy marketing tagline under 12 words"
}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude returned invalid JSON')

  return JSON.parse(jsonMatch[0])
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export const maxDuration = 60
export const config = { api: { bodyParser: false } }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireAdmin(req, res)) return

  let fields: Record<string, string> = {}
  let coverFile: ParsedFile | undefined

  let parsed: { fields: Record<string, string>; files: Record<string, ParsedFile> }
  try {
    parsed = await parseForm(req)
    fields = parsed.fields
    coverFile = parsed.files['cover']
  } catch (err) {
    console.error('[upload-book] form parse error:', err)
    return res.status(400).json({ error: 'Could not parse upload. Send multipart/form-data.' })
  }

  const allowedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

  // ── Cover-only update (no DOCX) ───────────────────────────────────────────────
  if (!parsed.files['file']) {
    if (!fields.slug || !coverFile) {
      return res.status(400).json({ error: 'No DOCX file received. To update only the cover, include slug and cover.' })
    }
    if (!allowedImageTypes.includes(coverFile.mimeType)) {
      return res.status(400).json({ error: 'Cover must be PNG, JPG, or WebP.' })
    }
    const ext = coverFile.mimeType === 'image/webp' ? 'webp' : coverFile.mimeType === 'image/png' ? 'png' : 'jpg'
    const coverPath = `${fields.slug}.${ext}`
    const { error: coverErr } = await supabase.storage
      .from('covers').upload(coverPath, coverFile.buffer, { contentType: coverFile.mimeType, upsert: true })
    if (coverErr) {
      console.error('[upload-book] cover-only upload error:', coverErr)
      return res.status(500).json({ error: `Cover upload failed: ${coverErr.message}` })
    }
    const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath)
    const { error: dbError } = await supabase.from('books').update({ cover_url: publicUrl }).eq('slug', fields.slug)
    if (dbError) {
      console.error('[upload-book] cover-only DB update error:', dbError)
      return res.status(500).json({ error: `DB update failed: ${dbError.message}` })
    }
    return res.status(200).json({ coverUrl: publicUrl, message: 'Cover updated.' })
  }

  // ── Full book upload (DOCX required) ─────────────────────────────────────────
  const docxBuffer = parsed.files['file'].buffer
  const filename = parsed.files['file'].filename

  if (!filename.toLowerCase().endsWith('.docx')) {
    return res.status(400).json({ error: 'File must be a .docx document.' })
  }

  if (coverFile) {
    if (!allowedImageTypes.includes(coverFile.mimeType)) {
      return res.status(400).json({ error: 'Cover must be PNG, JPG, or WebP.' })
    }
  }

  const { title, author, penNameId, genre, price } = fields
  if (!title || !author || !genre || !price) {
    return res.status(400).json({ error: 'Missing required fields: title, author, genre, price' })
  }

  const slug = slugify(title)
  const parsedPrice = parseFloat(price)

  // ── 1. Extract text from DOCX ─────────────────────────────
  let htmlContent: string
  let plainText: string
  try {
    const result = await mammoth.convertToHtml({ buffer: docxBuffer })
    htmlContent = result.value
    plainText = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  } catch (err) {
    console.error('[upload-book] mammoth error:', err)
    return res.status(422).json({ error: 'Could not read DOCX file. Ensure it is a valid .docx format.' })
  }

  // ── 2. Generate metadata via Claude ──────────────────────
  let metadata: Awaited<ReturnType<typeof generateMetadata>>
  try {
    metadata = await generateMetadata(title, author, genre, plainText)
  } catch (err) {
    console.error('[upload-book] Claude error:', err)
    return res.status(500).json({ error: 'Metadata generation failed. Check ANTHROPIC_API_KEY.' })
  }

  // ── 3. Generate PDF ───────────────────────────────────────
  let pdfBytes: Buffer
  try {
    pdfBytes = await generatePdf(title, author, htmlContent)
  } catch (err) {
    console.error('[upload-book] PDF error:', err)
    return res.status(500).json({ error: 'PDF generation failed.' })
  }

  // ── 4. Generate EPUB ──────────────────────────────────────
  let epubBytes: Buffer
  try {
    epubBytes = await generateEpub(title, author, htmlContent, metadata.description)
  } catch (err) {
    console.error('[upload-book] EPUB error:', err)
    return res.status(500).json({ error: 'EPUB generation failed.' })
  }

  // ── 5. Upload to Supabase Storage ─────────────────────────
  const pdfPath  = `${slug}.pdf`
  const epubPath = `${slug}.epub`

  const [pdfUpload, epubUpload] = await Promise.all([
    supabase.storage.from('ebooks').upload(pdfPath,  pdfBytes,  {
      contentType: 'application/pdf',
      upsert: true,
    }),
    supabase.storage.from('ebooks').upload(epubPath, epubBytes, {
      contentType: 'application/epub+zip',
      upsert: true,
    }),
  ])

  if (pdfUpload.error || epubUpload.error) {
    const storageErr = pdfUpload.error?.message ?? epubUpload.error?.message
    console.error('[upload-book] Storage upload error:', storageErr)
    return res.status(500).json({ error: `Storage upload failed: ${storageErr}` })
  }

  // ── 5b. Upload cover image ────────────────────────────────
  let coverUrl: string | null = null
  if (coverFile && coverFile.buffer.length > 0) {
    const ext = coverFile.mimeType === 'image/jpeg' || coverFile.mimeType === 'image/jpg'
      ? 'jpg'
      : coverFile.mimeType === 'image/webp'
        ? 'webp'
        : 'png'
    const coverPath = `${slug}.${ext}`
    const { error: coverErr } = await supabase.storage
      .from('covers')
      .upload(coverPath, coverFile.buffer, { contentType: coverFile.mimeType, upsert: true })
    if (coverErr) {
      console.error('[upload-book] Cover upload error:', coverErr)
      return res.status(500).json({ error: `Cover upload failed: ${coverErr.message}` })
    }
    const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath)
    coverUrl = publicUrl
  }

  // ── 6. Upsert book record ─────────────────────────────────
  const record: Record<string, unknown> = {
    slug,
    title,
    author,
    pen_name_id:       penNameId ?? '',
    genre,
    description:       metadata.description,
    short_description: metadata.shortDescription,
    pdf_path:          pdfPath,
    epub_path:         epubPath,
    price:             parsedPrice,
    available:         true,
    bisac_codes:       metadata.bisac,
    seo_keywords:      metadata.seoKeywords,
    tagline:           metadata.tagline,
  }
  if (coverUrl !== null) record.cover_url = coverUrl

  const { data: upserted, error: dbError } = await supabase
    .from('books')
    .upsert(record, { onConflict: 'slug' })
    .select()
    .single()

  if (dbError) {
    console.error('[upload-book] DB upsert error:', dbError)
    return res.status(500).json({ error: `Database upsert failed: ${dbError.message}` })
  }

  // Bust the books cache by purging the edge function
  // (Vercel CDN cache invalidation happens automatically on next request after s-maxage)

  return res.status(200).json({
    book:     upserted,
    metadata: metadata,
    files:    { pdf: pdfPath, epub: epubPath, cover: coverUrl ?? undefined },
    message:  `Book "${title}" processed and saved.`,
  })
}
