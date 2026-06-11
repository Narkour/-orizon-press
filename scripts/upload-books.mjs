// scripts/upload-books.mjs  —  node scripts/upload-books.mjs
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT       = join(__dirname, '..')
const BOOKS_DIR  = 'C:\\Users\\user\\OneDrive\\Desktop\\BOOKS'
const COVERS_DIR = 'C:\\Users\\user\\Downloads\\Covers'

// ── Env ───────────────────────────────────────────────────────────────────────
const envText = readFileSync(join(ROOT, '.env.local'), 'utf8')
const env = Object.fromEntries(
  envText.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const i = l.indexOf('=')
      const k = l.slice(0, i).trim()
      let v = l.slice(i + 1).trim()
      // strip surrounding double-quotes if present
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
      return [k, v]
    })
)
const SUPABASE_URL = env.SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SECRET_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_URL or SUPABASE_SECRET_KEY missing/empty in .env.local')
  console.error('       Add the real values from Supabase Dashboard → Settings → API')
  process.exit(1)
}
console.log(`Supabase: ${SUPABASE_URL.slice(0, 40)}...`)

// ── SQL for books table ───────────────────────────────────────────────────────
const CREATE_TABLE_SQL = `
create table if not exists public.books (
  id                uuid          primary key default gen_random_uuid(),
  slug              text          unique not null,
  title             text          not null,
  author            text          not null,
  pen_name_id       text,
  genre             text          not null default '',
  description       text          not null default '',
  short_description text          not null default '',
  cover_url         text          not null default '',
  pdf_path          text          not null default '',
  price             numeric(10,2) not null default 9.99,
  available         boolean       not null default true,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);
alter table public.books enable row level security;
create policy if not exists "Public read books" on public.books
  for select using (true);
`

// ── Book definitions ──────────────────────────────────────────────────────────
// cover: null          = no cover yet (placeholder)
// coverDir: 'covers'   = file is in COVERS_DIR (Downloads/Covers)
// coverDir: 'books'    = file is in BOOKS_DIR  (Desktop/BOOKS)
// coverLocal: '/covers/x.png' = static public asset — stored as cover_url directly, no upload needed
// hasPdf: false        = no docx found; upload cover + stub row only

const BOOKS = [
  // ── Full uploads: docx + cover both confirmed ──────────────────────────────
  {
    slug:        'abundance-is-the-only-reality',
    title:       'Abundance Is the Only Reality',
    author:      'J.N. Nartey',
    pen_name_id: 'jn-nartey',
    genre:       'Self-Help & Personal Growth',
    docx:        'Abundance Is the Only Reality.docx',
    cover:       'Copilot_20260610_211610.png',
    coverDir:    'covers',
  },
  {
    slug:        'the-world-in-50-years',
    title:       'The World in 50 Years',
    author:      'J.N. Nartey',
    pen_name_id: 'jn-nartey',
    genre:       'Science & Society',
    docx:        'The World in 50 Years.docx',
    cover:       'Copilot_20260610_211539.png',
    coverDir:    'covers',
  },
  {
    slug:        'the-lost-kingdoms-of-africa',
    title:       'The Lost Kingdoms of Africa',
    author:      'Ajona Penhart',
    pen_name_id: 'ajona-penhart',
    genre:       'African History',
    docx:        'The Lost Kingdoms of Africa.docx',
    cover:       'Copilot_20260610_211600.png',
    coverDir:    'covers',
  },
  {
    slug:        'the-isis-transmissions',
    title:       'The Isis Transmissions',
    author:      'JOJO PENWOOD',
    pen_name_id: 'jojo-penwood',
    genre:       'African Spirituality & Consciousness',
    docx:        'ISIS TRANSMISSIONS.docx',
    cover:       'Copilot_20260610_211526.png',
    coverDir:    'covers',
  },
  {
    slug:        'the-psychology-of-narcissism',
    title:       'The Psychology of Narcissism',
    author:      'J.N. Nartey',
    pen_name_id: 'jn-nartey',
    genre:       'Self-Help & Personal Growth',
    docx:        'Narcissism.docx',
    cover:       'Copilot_20260610_211511.png',
    coverDir:    'covers',
  },
  {
    slug:        'sudan-empire-faith-and-freedom',
    title:       'Sudan: Empire, Faith and Freedom',
    author:      'Ajona Penhart',
    pen_name_id: 'ajona-penhart',
    genre:       'African History',
    docx:        'Sudan.docx',
    cover:       'Copilot_20260610_211453.png',
    coverDir:    'covers',
  },

  // ── docx + static cover (local public asset) ──────────────────────────────
  {
    slug:              'chronicles-of-ancient-africa',
    title:             'Chronicles of Ancient Africa: A Timeless Journey',
    author:            'J.N. Nartey',
    pen_name_id:       'jn-nartey',
    genre:             'African History',
    docx:              'Chronicles of Ancient Africa.docx',
    coverLocal:        '/covers/chronicles-english.png',
    description:       "From the cradle of humanity to the grandeur of ancient empires, this sweeping history restores Africa's rightful place at the centre of the human story. Covering ancient Egypt, Kush, Carthage, Axum, Great Zimbabwe, and the kingdoms of West Africa, Chronicles of Ancient Africa is an essential guide to the continent's extraordinary past.",
    short_description: "A sweeping history that restores Africa's rightful place at the centre of the human story.",
  },
  {
    slug:              'ancient-and-indigenous-african-religions',
    title:             'Ancient and Indigenous African Religions: Traditions, Practices, and Contemporary Relevance',
    author:            'J.N. Nartey',
    pen_name_id:       'jn-nartey',
    genre:             'African Spirituality & Consciousness',
    docx:              'AFRICAN RELIGIONS.docx',
    coverLocal:        '/covers/religions.png',
    description:       "A scholarly yet accessible exploration of Africa's profound and diverse religious traditions — from Yoruba Orisha worship and Akan spirituality to Ubuntu philosophy and ancestral veneration. This book restores dignity and intellectual depth to traditions too long dismissed, revealing their continuing relevance in the modern world.",
    short_description: "A scholarly yet accessible exploration of Africa's profound and diverse religious traditions.",
  },
  {
    slug:              'the-energy-body',
    title:             'The Energy Body: Exploring the Human Biofield',
    author:            'JOJO PENWOOD',
    pen_name_id:       'jojo-penwood',
    genre:             'African Spirituality & Consciousness',
    docx:              'The Energy Body.docx',
    coverLocal:        '/covers/energy-body.png',
    description:       'A comprehensive scientific and spiritual investigation of the human biofield — the invisible energy field that surrounds every living being. Bridging ancient Vedic wisdom, Traditional Chinese Medicine, and cutting-edge biofield research, this book reveals the profound connections between energy, consciousness, health, and human potential.',
    short_description: 'A comprehensive scientific and spiritual investigation of the human biofield.',
  },

  // ── Supabase covers from Downloads/Covers ─────────────────────────────────
  {
    slug:        'the-soul-of-the-land',
    title:       'The Soul of the Land',
    author:      'Ajona Penhart',
    pen_name_id: 'ajona-penhart',
    genre:       'African History',
    docx:        'African customs and ethics.docx',
    cover:       'Copilot_20260610_211621.png',
    coverDir:    'covers',
  },
  {
    slug:        'the-psychology-of-self-sabotage',
    title:       'The Psychology of Self-Sabotage',
    author:      'JOJO PENWOOD',
    pen_name_id: 'jojo-penwood',
    genre:       'Self-Help & Personal Growth',
    docx:        'Self-Dabotage.docx',
    cover:       'Copilot_20260610_211551.png',
    coverDir:    'covers',
  },
  {
    slug:        'the-vibrational-universe',
    title:       'The Vibrational Universe',
    author:      'JOJO PENWOOD',
    pen_name_id: 'jojo-penwood',
    genre:       'Spirituality & Consciousness',
    docx:        'Vibrational_Universe_JoJo_Penwood.docx',
    cover:       'ChatGPT Image Jun 10, 2026, 09_16_45 PM.png',
    coverDir:    'covers',
  },
  {
    slug:        'unveiling-the-cosmos',
    title:       'Unveiling the Cosmos',
    author:      'J.N. Nartey',
    pen_name_id: 'jn-nartey',
    genre:       'Science & Society',
    docx:        'Upstanding the Cosmos.docx',
    cover:       'ChatGPT Image Jun 10, 2026, 09_17_07 PM.png',
    coverDir:    'covers',
  },
  {
    slug:        'unlocking-the-forces-of-wealth-and-abundance',
    title:       'Unlocking the Forces of Wealth and Abundance',
    author:      'J.N. Nartey',
    pen_name_id: 'jn-nartey',
    genre:       'Self-Help & Personal Growth',
    docx:        'Wealth and abundance.docx',
    coverLocal:  '/covers/wealth.png',
    description:       'Discover the hidden energetic laws behind financial success. Drawing on the Law of Attraction, ancient wisdom traditions, and modern psychology, this transformative guide reveals how your thoughts, beliefs, and energetic frequency shape your financial reality — and how to consciously align with abundance, purpose, and prosperity.',
    short_description: 'Discover the hidden energetic laws behind financial success and align with abundance.',
  },

  // ── Original catalogue books — being added to Supabase ────────────────────
  {
    slug:              'the-shadow-of-the-baobab',
    title:             'The Shadow of the Baobab',
    author:            'Ajona Penhart',
    pen_name_id:       'ajona-penhart',
    genre:             'Historical Fiction',
    docx:              'The Shadow of the Baobab updated.docx',
    coverLocal:        '/covers/baobab.png',
    description:       "An epic historical novel spanning centuries of African history, told through the eyes of a griot keeper of ancient chronicles. From the rise of the Mali Empire to the arrival of European explorers, The Shadow of the Baobab weaves legend, memory, and truth into a sweeping narrative of a continent's soul.",
    short_description: 'An epic historical novel spanning centuries of African history, told through the eyes of a griot.',
  },
  {
    slug:              'astrology-divination-everyday-life',
    title:             'Astrology, Divination, and Everyday Life',
    author:            'J.N. Nartey',
    pen_name_id:       'jn-nartey',
    genre:             'Religion & Spirituality',
    docx:              'Astrology and everyday life.docx',
    coverLocal:        '/covers/astrology.png',
    description:       'A comprehensive exploration of astrology and divination across world cultures — from Babylonian star-reading to Vedic Jyotish, from the I Ching to Tarot. This book bridges ancient wisdom and modern life, offering practical guidance for anyone seeking to understand the cosmic patterns that shape human experience.',
    short_description: 'A comprehensive exploration of astrology and divination across world cultures.',
  },
  {
    slug:              'nostradamus-prophecies-secrets',
    title:             'Nostradamus: Prophecies, Secrets, and the Fate of the World',
    author:            'JOJO PENWOOD',
    pen_name_id:       'jojo-penwood',
    genre:             'Religion & Spirituality',
    docx:              'Nostradamus.docx',
    coverLocal:        '/covers/nostradamus.png',
    description:       "A gripping exploration of history's most famous prophet — his hidden Jewish heritage, his Renaissance mind, and the cryptic quatrains that have haunted humanity for five centuries. Neither pure believer nor dismissive skeptic, this book seeks the real Nostradamus: a brilliant, tormented visionary whose shadow stretches across every crisis of the modern world.",
    short_description: "A gripping exploration of history's most famous prophet — his hidden heritage, Renaissance mind, and cryptic quatrains.",
  },
  {
    slug:              'messengers-from-sirius',
    title:             'Messengers from Sirius: The Dogon, the Stars, and the Science of the Ancients',
    author:            'JOJO PENWOOD',
    pen_name_id:       'jojo-penwood',
    genre:             'African Spirituality & Consciousness',
    docx:              'dogon cosmology.docx',
    coverLocal:        '/covers/dogon.png',
    description:       'The Dogon people of Mali possessed detailed knowledge of Sirius B — an invisible star that Western astronomy only confirmed in the 20th century. This extraordinary investigation explores the Dogon cosmology, their cosmic mythology, and the profound questions their stellar knowledge raises about the origins of human understanding.',
    short_description: "An extraordinary investigation into the Dogon people's ancient knowledge of the star Sirius B.",
  },
  {
    slug:              'when-the-call-to-prayer-fell-silent',
    title:             'When the Call to Prayer Fell Silent',
    author:            'Ajora Kandasorey',
    pen_name_id:       'ajora-kandasorey',
    genre:             'Literary Fiction',
    docx:              'When the call to prayer fell silent.docx',
    coverLocal:        '/covers/prayer.png',
    description:       "In the dusty university town of Dandari, Aishatu's ordinary morning prayer is interrupted by a world unravelling. A powerful, intimate novel about faith, survival, and the courage of ordinary people caught in the fires of conflict. When the call to prayer falls silent, what remains of who we are?",
    short_description: 'A powerful, intimate novel about faith, survival, and the courage of ordinary people caught in conflict.',
  },
  {
    slug:              'chroniques-afrique-ancienne',
    title:             "Chroniques de l'Afrique Ancienne: Un Voyage Intemporel",
    author:            'J.N. Nartey',
    pen_name_id:       'jn-nartey',
    genre:             'African History',
    docx:              'Chroniques de la Afrique.docx',
    coverLocal:        '/covers/chronicles-french.png',
    description:       "L'édition française de Chronicles of Ancient Africa. De l'aube de l'humanité à la grandeur des empires antiques, ce livre célèbre l'histoire extraordinaire du continent africain — ses civilisations, ses royaumes, et son héritage durable pour l'humanité.",
    short_description: "L'édition française de Chronicles of Ancient Africa — une célébration de l'histoire africaine.",
  },
]

// ── Supabase helpers ──────────────────────────────────────────────────────────
const baseHdr = { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'apikey': SUPABASE_KEY }

async function supaFetch(path, opts = {}) {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...opts, headers: { ...baseHdr, ...opts.headers },
  })
}

async function checkTable() {
  const res = await supaFetch('/rest/v1/books?limit=0')
  return res.ok || res.status === 416  // 416 = Range Not Satisfiable (table exists but empty)
}

async function ensureBucket(id, isPublic) {
  const check = await supaFetch(`/storage/v1/bucket/${id}`)
  if (check.ok) { console.log(`  ✓ bucket "${id}" exists`); return }
  const res = await supaFetch('/storage/v1/bucket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name: id, public: isPublic }),
  })
  if (!res.ok) throw new Error(`Cannot create bucket "${id}": ${await res.text()}`)
  console.log(`  ✓ created bucket "${id}" (public=${isPublic})`)
}

async function uploadFile(bucket, remotePath, localPath, contentType) {
  const data = readFileSync(localPath)
  const res = await supaFetch(`/storage/v1/object/${bucket}/${remotePath}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'x-upsert': 'true' },
    body: data,
  })
  if (!res.ok) throw new Error(`Upload failed [${remotePath}]: ${await res.text()}`)
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${remotePath}`
}

async function upsertBook(record) {
  const res = await supaFetch('/rest/v1/books?on_conflict=slug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(record),
  })
  if (!res.ok) throw new Error(`DB upsert failed: ${await res.text()}`)
}

// ── Word docx→PDF conversion ──────────────────────────────────────────────────
function convertToPDF(docxWin) {
  const pdfWin = docxWin.replace(/\.docx$/i, '.pdf')
  if (existsSync(pdfWin)) { console.log(`    ✓ PDF already exists`); return pdfWin }
  const esc = s => s.replace(/'/g, "''")
  const ps1 = join(tmpdir(), `orizon_${Date.now()}.ps1`)
  writeFileSync(ps1, `
$ErrorActionPreference = 'Stop'
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
$d = $w.Documents.Open('${esc(docxWin)}')
$d.SaveAs2('${esc(pdfWin)}', 17)
$d.Close([ref]$false)
$w.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($w) | Out-Null
`)
  try {
    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1], {
      timeout: 120_000, stdio: 'pipe',
    })
  } catch (e) {
    throw new Error(`Word conversion failed: ${(e.stderr?.toString() ?? e.message).trim()}`)
  }
  if (!existsSync(pdfWin)) throw new Error(`PDF not created at expected path`)
  return pdfWin
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║    Orizon Press — Batch Book Upload          ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  // 1. Check books table
  process.stdout.write('Checking books table... ')
  const tableOk = await checkTable()
  if (!tableOk) {
    console.log('NOT FOUND\n')
    console.log('Run this SQL in Supabase Dashboard → SQL Editor:\n')
    console.log(CREATE_TABLE_SQL)
    console.log('\nThen re-run: node scripts/upload-books.mjs')
    process.exit(1)
  }
  console.log('OK\n')

  // 2. Storage buckets
  console.log('Storage buckets:')
  await ensureBucket('ebooks', false)  // private — PDFs
  await ensureBucket('covers', true)   // public  — cover images

  // 3. Process books
  const results = []
  for (const book of BOOKS) {
    console.log(`\n▶ ${book.title}`)

    try {
      let pdfPath = ''
      let coverUrl = ''

      // ── PDF conversion + upload
      if (book.docx) {
        const docxWin = join(BOOKS_DIR, book.docx)
        if (!existsSync(docxWin)) throw new Error(`docx not found: ${book.docx}`)
        console.log(`  ① Converting → PDF`)
        const pdfWin = convertToPDF(docxWin)
        console.log(`  ② Uploading PDF`)
        await uploadFile('ebooks', `${book.slug}.pdf`, pdfWin, 'application/pdf')
        pdfPath = `${book.slug}.pdf`
        console.log(`     ✓ ebooks/${pdfPath}`)
      } else {
        console.log(`  ① No docx — skipping PDF (will mark unavailable)`)
      }

      // ── Cover
      if (book.coverLocal) {
        // Static public asset — store path directly, no upload needed
        coverUrl = book.coverLocal
        const step = book.docx ? '③' : '②'
        console.log(`  ${step} Static cover: ${book.coverLocal}`)
      } else if (book.cover) {
        const dir  = book.coverDir === 'covers' ? COVERS_DIR : BOOKS_DIR
        const path = join(dir, book.cover)
        if (!existsSync(path)) throw new Error(`cover not found: ${book.cover}`)
        const ext  = book.cover.split('.').pop().toLowerCase()
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg'
        const step = book.docx ? '③' : '②'
        console.log(`  ${step} Uploading cover`)
        coverUrl = await uploadFile('covers', `${book.slug}.${ext}`, path, mime)
        console.log(`     ✓ covers/${book.slug}.${ext}`)
      } else {
        const step = book.docx ? '③' : '②'
        console.log(`  ${step} No cover assigned — upload later`)
      }

      // ── DB upsert
      const hasCover = !!(book.coverLocal || book.cover)
      const step = book.docx ? '④' : (hasCover ? '③' : '②')
      console.log(`  ${step} Upserting DB record`)
      await upsertBook({
        slug:              book.slug,
        title:             book.title,
        author:            book.author,
        pen_name_id:       book.pen_name_id,
        genre:             book.genre,
        description:       book.description ?? `${book.title} by ${book.author}. Available as an eBook from Orizon Press.`,
        short_description: book.short_description ?? `${book.title} — ${book.genre}`,
        cover_url:         coverUrl,
        pdf_path:          pdfPath,
        price:             9.99,
        available:         !!pdfPath,
      })

      const flags = [pdfPath ? '📄 PDF' : '⏳ PDF pending', coverUrl ? '🖼 Cover' : '⏳ Cover pending']
      console.log(`  ✓ DONE  [${flags.join(' · ')}]`)
      results.push({ title: book.title, status: 'OK', pdfPath, coverUrl })

    } catch (err) {
      console.error(`  ✗ FAILED: ${err.message}`)
      results.push({ title: book.title, status: 'ERROR', note: err.message })
    }
  }

  // 4. Summary
  console.log('\n\n╔══════════════════════════════════════════════╗')
  console.log('║    SUMMARY                                   ║')
  console.log('╚══════════════════════════════════════════════╝')
  const ok      = results.filter(r => r.status === 'OK')
  const errors  = results.filter(r => r.status === 'ERROR')
  const full    = ok.filter(r => r.pdfPath && r.coverUrl)
  const partial = ok.filter(r => !r.pdfPath || !r.coverUrl)
  for (const r of full)    console.log(`  ✓ ${r.title}`)
  for (const r of partial) console.log(`  ⚠ ${r.title} (${[!r.pdfPath && 'PDF pending', !r.coverUrl && 'cover pending'].filter(Boolean).join(', ')})`)
  for (const r of errors)  console.log(`  ✗ ${r.title}: ${r.note}`)
  console.log(`\n  Processed: ${ok.length}/${BOOKS.length}  |  Full (PDF+cover): ${full.length}  |  Errors: ${errors.length}`)

  console.log('\n── Note: Messengers from Sirius skipped — add files when ready and re-run.')
}

main().catch(err => { console.error('\nFatal:', err.message); process.exit(1) })
