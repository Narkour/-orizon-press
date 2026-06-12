/**
 * POST /api/admin/lulu-create-pod
 * Creates a Lulu print-on-demand job for a book.
 *
 * Body: {
 *   slug, title,
 *   interiorPdfUrl,   — direct HTTPS URL to the interior PDF
 *   coverSourceUrl,   — direct HTTPS URL to the cover (ideally Lulu-spec PDF; PNG accepted for proofs)
 *   podPackageId?,    — defaults to 6x9 B&W standard paperback
 *   quantity?,        — defaults to 1
 *   shippingName, shippingStreet, shippingCity,
 *   shippingState, shippingCountry, shippingPostcode, shippingPhone
 * }
 *
 * Requires env vars: LULU_CLIENT_KEY, LULU_CLIENT_SECRET
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/admin-auth.js'
import { rateLimit } from '../_lib/rate-limit.js'

const LULU_TOKEN_URL = 'https://api.lulu.com/auth/realms/glasstree/protocol/openid-connect/token'
const LULU_API_BASE  = 'https://api.lulu.com'

// 6x9 B&W standard paperback, uncoated white 60# paper, matte cover
const DEFAULT_POD_PACKAGE = '0600X0900BWSTDPB060UW444MXX'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function getLuluToken(): Promise<string> {
  const res = await fetch(LULU_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     process.env.LULU_CLIENT_KEY!,
      client_secret: process.env.LULU_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) throw new Error(`Lulu auth failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireAdmin(req, res)) return
  if (!rateLimit(req, res, { limit: 20, windowMs: 60 * 60_000, label: 'lulu' })) return

  if (!process.env.LULU_CLIENT_KEY || !process.env.LULU_CLIENT_SECRET) {
    return res.status(501).json({ error: 'LULU_CLIENT_KEY / LULU_CLIENT_SECRET not configured.' })
  }

  const {
    slug, title,
    interiorPdfUrl, coverSourceUrl,
    podPackageId,
    quantity = 1,
    shippingName, shippingStreet, shippingCity,
    shippingState, shippingCountry = 'US', shippingPostcode, shippingPhone,
  } = req.body ?? {}

  if (!slug || !title || !interiorPdfUrl || !coverSourceUrl ||
      !shippingName || !shippingStreet || !shippingCity || !shippingState || !shippingPostcode || !shippingPhone) {
    return res.status(400).json({
      error: 'Required fields: slug, title, interiorPdfUrl, coverSourceUrl, ' +
             'shippingName, shippingStreet, shippingCity, shippingState, shippingPostcode, shippingPhone',
    })
  }

  try {
    const token = await getLuluToken()

    const body = {
      contact_email: 'jnartey79@gmail.com',
      external_id:   `orizon-${slug}-${Date.now()}`,
      line_items: [
        {
          external_id: slug,
          title,
          printable_normalization: {
            interior:      { source_url: interiorPdfUrl },
            cover:         { source_url: coverSourceUrl },
            pod_package_id: podPackageId ?? DEFAULT_POD_PACKAGE,
          },
          quantity: Math.max(1, Math.floor(Number(quantity))),
        },
      ],
      shipping_address: {
        name:         shippingName,
        street1:      shippingStreet,
        city:         shippingCity,
        state_code:   shippingState,
        country_code: shippingCountry,
        postcode:     shippingPostcode,
        phone_number: shippingPhone,
      },
      shipping_option_level: 'GROUND',
      is_reorder: false,
    }

    const printRes = await fetch(`${LULU_API_BASE}/print-jobs/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(body),
    })

    const printData = await printRes.json() as {
      id: number; status?: { name: string }; line_items?: unknown[]
    }

    if (!printRes.ok) {
      return res.status(502).json({ error: 'Lulu API error', detail: printData })
    }

    // Store the Lulu job ID on the book record
    await supabase
      .from('books')
      .update({ lulu_job_id: String(printData.id) })
      .eq('slug', slug)

    return res.status(200).json({
      luluJobId:    printData.id,
      status:       printData.status?.name ?? 'CREATED',
      dashboardUrl: 'https://www.lulu.com/account/orders',
    })
  } catch (err) {
    console.error('[lulu-create-pod]', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Lulu request failed' })
  }
}
