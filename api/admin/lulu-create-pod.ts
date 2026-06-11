/**
 * POST /api/admin/lulu-create-pod
 * Creates or retrieves a Lulu print-on-demand product for a book.
 *
 * Body: { slug, title, author, interiorPdfUrl, coverPdfUrl, isbn? }
 * Returns: { luluJobId, printJobUrl }
 *
 * Lulu API docs: https://api.lulu.com/dashboard/
 * Requires env vars: LULU_CLIENT_KEY, LULU_CLIENT_SECRET
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/admin-auth.js'
import { rateLimit } from '../_lib/rate-limit.js'

const LULU_TOKEN_URL  = 'https://api.lulu.com/auth/realms/glasstree/protocol/openid-connect/token'
const LULU_API_BASE   = 'https://api.lulu.com'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function getLuluToken(): Promise<string> {
  const clientKey    = process.env.LULU_CLIENT_KEY!
  const clientSecret = process.env.LULU_CLIENT_SECRET!

  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     clientKey,
    client_secret: clientSecret,
  })

  const res = await fetch(LULU_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Lulu auth failed: ${res.status} ${text}`)
  }

  const data = await res.json() as { access_token: string }
  return data.access_token
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireAdmin(req, res)) return
  if (!rateLimit(req, res, { limit: 20, windowMs: 60 * 60_000, label: 'lulu' })) return

  const { slug, title, author, interiorPdfUrl, coverPdfUrl, isbn } = req.body ?? {}

  if (!slug || !title || !author || !interiorPdfUrl || !coverPdfUrl) {
    return res.status(400).json({
      error: 'Required: slug, title, author, interiorPdfUrl, coverPdfUrl',
    })
  }

  if (!process.env.LULU_CLIENT_KEY || !process.env.LULU_CLIENT_SECRET) {
    return res.status(501).json({
      error: 'LULU_CLIENT_KEY and LULU_CLIENT_SECRET env vars not configured.',
    })
  }

  try {
    const token = await getLuluToken()

    // Create a print job estimate / product listing
    const printJobBody = {
      contact_email: 'jnartey79@gmail.com',
      external_id:   `orizon-${slug}`,
      line_items: [
        {
          title,
          cover_finish:   'MATTE',
          interior_color: 'BW',   // BLACK_AND_WHITE interior for cost efficiency
          print_quality:  'STANDARD',
          page_count:     0,       // Lulu auto-detects from PDF
          pod_package_id: '0600X0900BWSTDPB060UW444MXX',  // 6x9 B&W Standard paperback
          external_id:    slug,
          metadata: {
            title,
            author,
            ...(isbn ? { isbn } : {}),
          },
          source_file_url:   interiorPdfUrl,
          cover_source_url:  coverPdfUrl,
        },
      ],
      shipping_option_level: 'MAIL',
    }

    const printRes = await fetch(`${LULU_API_BASE}/print-jobs/`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(printJobBody),
    })

    const printData = await printRes.json() as {
      id: string; status: { name: string }; line_items?: { external_id: string }[]
    }

    if (!printRes.ok) {
      return res.status(502).json({ error: 'Lulu API error', detail: printData })
    }

    // Save Lulu job ID back to the book record
    await supabase
      .from('books')
      .update({ lulu_job_id: printData.id })
      .eq('slug', slug)

    return res.status(200).json({
      luluJobId:   printData.id,
      status:      printData.status?.name,
      printJobUrl: `https://www.lulu.com/account/orders`,
    })
  } catch (err) {
    console.error('[lulu-create-pod]', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Lulu request failed' })
  }
}
