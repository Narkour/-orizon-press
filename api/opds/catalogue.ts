import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { getPenNameById } from '../../src/data/catalogue.js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const SITE = 'https://orizonpress.com'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function imgMime(url: string): string {
  if (/\.(jpe?g)$/i.test(url)) return 'image/jpeg'
  if (/\.webp$/i.test(url)) return 'image/webp'
  return 'image/png'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[/opds/catalogue]', error)
    return res.status(500).send('Internal Server Error')
  }

  const updated = new Date().toISOString()

  const entries = (books ?? []).map((book: {
    slug: string; title: string; pen_name_id: string; genre: string;
    short_description: string; cover_url: string; available: boolean;
    pdf_path: string; price: number;
  }) => {
    const author = getPenNameById(book.pen_name_id)
    const coverUrl = book.cover_url
      ? (book.cover_url.startsWith('/') ? `${SITE}${book.cover_url}` : book.cover_url)
      : null
    const coverType = coverUrl ? imgMime(coverUrl) : null
    const bookUrl = `${SITE}/books/${book.slug}`
    const ebookAvailable = book.available && !!book.pdf_path

    const coverLinks = coverUrl
      ? `    <link rel="http://opds-spec.org/image"
          href="${esc(coverUrl)}"
          type="${coverType}"/>
    <link rel="http://opds-spec.org/image/thumbnail"
          href="${esc(coverUrl)}"
          type="${coverType}"/>`
      : ''

    const buyLink = ebookAvailable
      ? `    <link rel="http://opds-spec.org/acquisition/buy"
          href="${bookUrl}"
          type="text/html">
      <opds:price currencycode="USD">${Number(book.price).toFixed(2)}</opds:price>
    </link>`
      : ''

    return `  <entry>
    <title>${esc(book.title)}</title>
    <id>${bookUrl}</id>
    <updated>${updated}</updated>
    <author><name>${esc(author?.name ?? 'Orizon Press')}</name></author>
    <category term="${esc(book.genre)}" label="${esc(book.genre)}"/>
    <summary>${esc(book.short_description || '')}</summary>
${coverLinks}
${buyLink}
  </entry>`
  })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opds="http://opds-spec.org/2010/catalog"
      xmlns:dc="http://purl.org/dc/terms/">
  <id>${SITE}/opds/catalogue</id>
  <title>Orizon Press — All Books</title>
  <updated>${updated}</updated>
  <author>
    <name>Orizon Press</name>
    <uri>${SITE}</uri>
  </author>
  <link rel="self"
        href="${SITE}/opds/catalogue"
        type="application/atom+xml;profile=opds-catalog;kind=acquisition"/>
  <link rel="start"
        href="${SITE}/opds"
        type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
  <link rel="up"
        href="${SITE}/opds"
        type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
${entries.join('\n')}
</feed>`

  res.setHeader('Content-Type', 'application/atom+xml;profile=opds-catalog')
  res.status(200).send(xml)
}
