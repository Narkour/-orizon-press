import type { VercelRequest, VercelResponse } from '@vercel/node'

const SITE = 'https://orizonpress.com'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const updated = new Date().toISOString()

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opds="http://opds-spec.org/2010/catalog">
  <id>${SITE}/opds</id>
  <title>Orizon Press</title>
  <updated>${updated}</updated>
  <author>
    <name>Orizon Press</name>
    <uri>${SITE}</uri>
  </author>
  <link rel="self"
        href="${SITE}/opds"
        type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
  <link rel="start"
        href="${SITE}/opds"
        type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
  <entry>
    <title>All Books</title>
    <id>${SITE}/opds/catalogue</id>
    <updated>${updated}</updated>
    <content type="text">Browse all titles published by Orizon Press — African history, fiction, spirituality and more.</content>
    <link rel="subsection"
          href="${SITE}/opds/catalogue"
          type="application/atom+xml;profile=opds-catalog;kind=acquisition"/>
  </entry>
</feed>`

  res.setHeader('Content-Type', 'application/atom+xml;profile=opds-catalog')
  res.status(200).send(xml)
}
