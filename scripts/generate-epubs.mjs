/**
 * generate-epubs.mjs
 * Reads every DOCX in C:\Users\user\OneDrive\Desktop\BOOKS\,
 * converts to EPUB, uploads to Supabase Storage (ebooks bucket),
 * and updates books.epub_path in the DB.
 *
 * Run: node scripts/generate-epubs.mjs
 * Prerequisites: npm install (mammoth, jszip already installed)
 */

import { readFileSync, existsSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, extname, basename } from 'path'
import mammoth from 'mammoth'
import JSZip from 'jszip'

const __dir = dirname(fileURLToPath(import.meta.url))

// ─── Load env ────────────────────────────────────────────────────────────────
const envPath = join(__dir, '..', '.env.local')
const envText = readFileSync(envPath, 'utf8')
const env = Object.fromEntries(
  envText.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] })
)

const SUPABASE_URL = env.SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SECRET_KEY
const BOOKS_DIR   = 'C:\\Users\\user\\OneDrive\\Desktop\\BOOKS'

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing env vars'); process.exit(1) }
if (!existsSync(BOOKS_DIR)) { console.error(`BOOKS_DIR not found: ${BOOKS_DIR}`); process.exit(1) }

// ─── Slug normaliser ──────────────────────────────────────────────────────────
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80)
}

// ─── EPUB builder ─────────────────────────────────────────────────────────────
async function buildEpub(title, author, htmlContent, description) {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  zip.folder('META-INF').file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)

  const oebps = zip.folder('OEBPS')

  oebps.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:publisher>Orizon Press</dc:publisher>
    <dc:description>${description.replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]))}</dc:description>
    <dc:language>en</dc:language>
    <dc:identifier id="uid">orizon-${slugify(title)}-${Date.now()}</dc:identifier>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml"      media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="css" href="style.css"      media-type="text/css"/>
  </manifest>
  <spine><itemref idref="ch1"/></spine>
</package>`)

  oebps.file('nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Contents</title></head>
<body><nav epub:type="toc"><ol><li><a href="chapter1.xhtml">${title}</a></li></ol></nav></body>
</html>`)

  oebps.file('style.css', `
body { font-family: Georgia, serif; font-size: 1em; line-height: 1.65; margin: 1.5em; color: #1a1410; }
h1,h2,h3 { font-family: Georgia,serif; font-weight:normal; margin-top:2em; }
p { margin:0 0 0.8em; text-indent:1.5em; }
p:first-of-type { text-indent:0; }
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
<p style="font-style:italic;text-indent:0">${author}</p>
<p style="font-style:italic;text-indent:0;color:#888">Orizon Press</p>
<hr/>
${htmlContent}
</body>
</html>`)

  return zip.generateAsync({ type: 'nodebuffer' })
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function supaFetch(path, opts = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      ...(opts.headers ?? {}),
    },
  })
  return res
}

async function getBooks() {
  const res = await supaFetch('/books?select=slug,title,author,description,epub_path')
  return res.json()
}

async function uploadEpub(slug, buffer) {
  const url = `${SUPABASE_URL}/storage/v1/object/ebooks/${slug}.epub`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/epub+zip',
      'x-upsert': 'true',
    },
    body: buffer,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Storage upload failed: ${res.status} ${text}`)
  }
  return `${slug}.epub`
}

async function updateEpubPath(slug, epubPath) {
  const res = await supaFetch(`/books?slug=eq.${slug}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({ epub_path: epubPath }),
  })
  if (!res.ok) throw new Error(`DB update failed: ${res.status}`)
}

// ─── Book→DOCX filename map ───────────────────────────────────────────────────
// Maps book slug to DOCX filename in BOOKS_DIR (adjust if filenames differ)
const SLUG_TO_DOCX = {
  'abundance-is-the-only-reality':           'Abundance_Is_the_Only_Reality.docx',
  'the-world-in-50-years':                   'The_World_in_50_Years.docx',
  'the-lost-kingdoms-of-africa':             'The_Lost_Kingdoms_of_Africa.docx',
  'the-isis-transmissions':                  'The_Isis_Transmissions.docx',
  'the-psychology-of-narcissism':            'The_Psychology_of_Narcissism.docx',
  'sudan-empire-faith-and-freedom':          'Sudan.docx',
  'chronicles-of-ancient-africa':            'Chronicles_of_Ancient_Africa.docx',
  'ancient-and-indigenous-african-religions':'Ancient_and_Indigenous_African_Religions.docx',
  'the-energy-body':                         'The_Energy_Body.docx',
  'the-soul-of-the-land':                    'African_customs_and_ethics.docx',
  'the-psychology-of-self-sabotage':         'Self-Dabotage.docx',
  'unveiling-the-cosmos':                    'Unveiling_the_Cosmos.docx',
  'unlocking-the-forces-of-wealth-and-abundance': 'Unlocking_the_Forces_of_Wealth_and_Abundance.docx',
  'the-vibrational-universe':                'Vibrational_Universe_JoJo_Penwood.docx',
  'the-shadow-of-the-baobab':                'Shadow_of_the_Baobab.docx',
  'astrology-divination-everyday-life':      'Astrology_Divination.docx',
  'nostradamus-prophecies-secrets':          'Nostradamus.docx',
  'messengers-from-sirius':                  'dogon cosmology.docx',
  'when-the-call-to-prayer-fell-silent':     'When_the_Call_to_Prayer_Fell_Silent.docx',
  'chroniques-afrique-ancienne':             'Chroniques_de_lAfrique_Ancienne.docx',
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // List actual DOCX files so we can fuzzy-match if exact name differs
  const actualFiles = new Set(
    readdirSync(BOOKS_DIR)
      .filter(f => extname(f).toLowerCase() === '.docx')
      .map(f => f.toLowerCase())
  )
  console.log(`Found ${actualFiles.size} DOCX files in BOOKS_DIR\n`)

  const books = await getBooks()
  console.log(`Processing ${books.length} books from Supabase...\n`)

  let ok = 0, skipped = 0, failed = 0

  for (const book of books) {
    const docxName = SLUG_TO_DOCX[book.slug]
    if (!docxName) {
      console.log(`  ⚠ ${book.slug} — no DOCX mapping, skipping`)
      skipped++
      continue
    }

    const docxPath = join(BOOKS_DIR, docxName)
    if (!existsSync(docxPath)) {
      // Try case-insensitive lookup
      const lower = docxName.toLowerCase()
      const match = readdirSync(BOOKS_DIR).find(f => f.toLowerCase() === lower)
      if (!match) {
        console.log(`  ✗ ${book.slug} — DOCX not found: ${docxName}`)
        failed++
        continue
      }
    }

    const resolvedPath = existsSync(docxPath)
      ? docxPath
      : join(BOOKS_DIR, readdirSync(BOOKS_DIR).find(f => f.toLowerCase() === docxName.toLowerCase()) ?? docxName)

    try {
      process.stdout.write(`  → ${book.slug}… `)

      // Extract HTML
      const docxBuffer = readFileSync(resolvedPath)
      const { value: htmlContent } = await mammoth.convertToHtml({ buffer: docxBuffer })

      // Build EPUB
      const epubBuffer = await buildEpub(book.title, book.author, htmlContent, book.description ?? '')

      // Upload
      const epubPath = await uploadEpub(book.slug, epubBuffer)

      // Update DB
      await updateEpubPath(book.slug, epubPath)

      console.log(`done (${Math.round(epubBuffer.length / 1024)} KB)`)
      ok++
    } catch (err) {
      console.log(`FAILED — ${err.message}`)
      failed++
    }
  }

  console.log(`\n────────────────────────────`)
  console.log(`✓ ${ok} EPUBs generated and uploaded`)
  if (skipped) console.log(`⚠ ${skipped} skipped (no DOCX mapping)`)
  if (failed)  console.log(`✗ ${failed} failed`)
  console.log('\nRun again after fixing any DOCX filename mismatches.')
  console.log('If a filename differs from the map above, edit SLUG_TO_DOCX in this script.')
}

main().catch(err => { console.error(err); process.exit(1) })
