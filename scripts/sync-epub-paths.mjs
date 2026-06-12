/**
 * sync-epub-paths.mjs
 * Run AFTER applying supabase/migrations/002_add_epub_fields.sql
 * Sets epub_path = '<slug>.epub' for all 20 books.
 *
 * Run: node scripts/sync-epub-paths.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const envText = readFileSync(join(__dir, '..', '.env.local'), 'utf8')
const env = Object.fromEntries(
  envText.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] })
)

const SUPABASE_URL = env.SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SECRET_KEY

// 'the-lost-kingdoms-of-africa' and 'messengers-from-sirius' excluded —
// their EPUBs contain embedded images making them 27–31 MB.
// Compress images in the source DOCX files, re-run generate-epubs.mjs for
// those two, then add them back here.
const slugs = [
  'abundance-is-the-only-reality', 'the-world-in-50-years',
  'the-isis-transmissions', 'the-psychology-of-narcissism', 'sudan-empire-faith-and-freedom',
  'chronicles-of-ancient-africa', 'ancient-and-indigenous-african-religions', 'the-energy-body',
  'the-soul-of-the-land', 'the-psychology-of-self-sabotage', 'unveiling-the-cosmos',
  'unlocking-the-forces-of-wealth-and-abundance', 'the-vibrational-universe',
  'the-shadow-of-the-baobab', 'astrology-divination-everyday-life', 'nostradamus-prophecies-secrets',
  'when-the-call-to-prayer-fell-silent', 'chroniques-afrique-ancienne',
]

async function main() {
  let ok = 0, fail = 0
  for (const slug of slugs) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/books?slug=eq.${encodeURIComponent(slug)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ epub_path: `${slug}.epub` }),
    })
    if (res.ok) { console.log(`  ✓ ${slug}`); ok++ }
    else { console.error(`  ✗ ${slug}: ${res.status} ${await res.text()}`); fail++ }
  }
  console.log(`\nDone: ${ok} updated, ${fail} failed`)
}

main().catch(e => { console.error(e); process.exit(1) })
