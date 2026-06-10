import type { VercelRequest, VercelResponse } from '@vercel/node'
import { books, getPenNameById } from '../../src/data/catalogue'

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

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const updated = new Date().toISOString()

  const entries = books.map(book => {
    const author = getPenNameById(book.penNameId)
    const coverUrl = book.coverImage ? `${SITE}${book.coverImage}` : null
    const coverType = coverUrl ? imgMime(coverUrl) : null
    const bookUrl = `${SITE}/books/${book.slug}`

    const coverLinks = coverUrl
      ? `    <link rel="http://opds-spec.org/image"
          href="${coverUrl}"
          type="${coverType}"/>
    <link rel="http://opds-spec.org/image/thumbnail"
          href="${coverUrl}"
          type="${coverType}"/>`
      : ''

    const buyLink = book.ebook.available
      ? `    <link rel="http://opds-spec.org/acquisition/buy"
          href="${bookUrl}"
          type="text/html">
      <opds:price currencycode="USD">${book.ebook.price.toFixed(2)}</opds:price>
    </link>`
      : ''

    return `  <entry>
    <title>${esc(book.title)}</title>
    <id>${bookUrl}</id>
    <updated>${updated}</updated>
    <author><name>${esc(author?.name ?? 'Orizon Press')}</name></author>
    <category term="${esc(book.genre)}" label="${esc(book.genre)}"/>
    <summary>${esc(book.shortDescription)}</summary>
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
