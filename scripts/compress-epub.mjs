/**
 * Compress oversized EPUBs stored in Supabase by stripping embedded base64 images.
 * Run: node scripts/compress-epub.mjs
 * Reads credentials from .env.local automatically.
 */

import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

// ── Robust .env.local loader (handles CRLF and Vercel CLI format) ─────────────
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    // strip surrounding quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    // don't overwrite already-set env vars
    if (key && !(key in process.env)) process.env[key] = val
  }
}

loadEnv(path.join(root, '.env.local'))
loadEnv(path.join(root, '.env'))

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_URL.startsWith('http')) {
  console.error('ERROR: SUPABASE_URL not found or invalid. Check .env.local')
  process.exit(1)
}
if (!SUPABASE_SECRET_KEY) {
  console.error('ERROR: SUPABASE_SECRET_KEY not found. Check .env.local')
  process.exit(1)
}

console.log(`Supabase URL: ${SUPABASE_URL.replace(/https:\/\/([^.]+).*/, 'https://$1.***')}`)

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

// Title fragments to match (case-insensitive, partial)
const TARGET_TITLES = ['Lost Kingdoms', 'Messengers from Sirius']

function stripBase64Images(html) {
  return html
    .replace(/<img[^>]+src="data:[^"]*"[^>]*\/?>/gi, '')
    .replace(/<img[^>]*>/gi, '')
}

function isImageFile(p) {
  return /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff?)$/i.test(p)
}

async function compressEpub(book) {
  console.log(`\n── ${book.title} (${book.slug}) ──`)
  console.log(`   epub_path: ${book.epub_path}`)

  const { data: fileData, error: dlErr } = await supabase.storage
    .from('ebooks')
    .download(book.epub_path)

  if (dlErr || !fileData) {
    console.error(`   ✗ Download failed: ${dlErr?.message ?? 'no data'}`)
    return
  }

  const originalBytes = Buffer.from(await fileData.arrayBuffer())
  console.log(`   Original : ${(originalBytes.length / 1024 / 1024).toFixed(2)} MB`)

  const zip = await JSZip.loadAsync(originalBytes)
  let removedImages = 0
  let strippedFiles = 0

  for (const [filePath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue
    if (isImageFile(filePath)) { zip.remove(filePath); removedImages++; continue }
    if (/\.(xhtml|html|htm|opf|ncx|xml)$/i.test(filePath)) {
      const content = await entry.async('string')
      const stripped = stripBase64Images(content)
      if (stripped !== content) { zip.file(filePath, stripped); strippedFiles++ }
    }
  }

  console.log(`   Stripped : ${removedImages} image file(s), ${strippedFiles} markup file(s) cleaned`)

  const newBytes = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  })

  const savedMB = ((originalBytes.length - newBytes.length) / 1024 / 1024).toFixed(2)
  console.log(`   Result   : ${(newBytes.length / 1024 / 1024).toFixed(2)} MB  (saved ${savedMB} MB)`)

  const { error: upErr } = await supabase.storage
    .from('ebooks')
    .upload(book.epub_path, newBytes, { contentType: 'application/epub+zip', upsert: true })

  if (upErr) { console.error(`   ✗ Upload failed: ${upErr.message}`); return }
  console.log(`   ✓ Re-uploaded to ${book.epub_path}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\nQuerying books table…')
const { data: books, error: listErr } = await supabase
  .from('books')
  .select('slug, title, epub_path')
  .not('epub_path', 'is', null)

if (listErr) { console.error('Failed to fetch books:', listErr.message); process.exit(1) }

const targets = books.filter(b =>
  TARGET_TITLES.some(t => b.title?.toLowerCase().includes(t.toLowerCase()))
)

if (targets.length === 0) {
  console.log('\nNo matching books found. Books with epub_path:')
  books.forEach(b => console.log(`  ${b.slug}: ${b.title}`))
  process.exit(0)
}

console.log(`\nCompressing ${targets.length} book(s):`)
targets.forEach(b => console.log(`  • ${b.title}`))

for (const book of targets) await compressEpub(book)

console.log('\n✓ Done.')
