import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Client, Environment, OrdersController } from '@paypal/paypal-server-sdk'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID!,
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET!,
  },
  environment: Environment.Production,
})

const ordersController = new OrdersController(paypalClient)

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const TOKEN_EXPIRY_HOURS = 24

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { orderId, buyerEmail, bookSlug, bookTitle, amount } = req.body ?? {}

  if (!orderId || !buyerEmail || !bookSlug || !bookTitle || !amount) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const { result: capture } = await ordersController.ordersCapture({
      id: orderId,
      prefer: 'return=representation',
    })

    if (capture.status !== 'COMPLETED') {
      return res.status(402).json({ error: `Payment not completed: ${capture.status}` })
    }

    const downloadToken = randomUUID()
    const tokenExpiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    ).toISOString()

    const { error: dbError } = await supabase.from('orders').insert({
      paypal_order_id: orderId,
      buyer_email: buyerEmail,
      book_slug: bookSlug,
      book_title: bookTitle,
      amount: parseFloat(amount),
      download_token: downloadToken,
      token_expires_at: tokenExpiresAt,
    })

    if (dbError) {
      console.error('[capture-paypal-order] Supabase insert error:', dbError)
      return res.status(500).json({ error: 'Failed to record order' })
    }

    return res.status(200).json({ downloadToken, expiresAt: tokenExpiresAt })
  } catch (err) {
    console.error('[capture-paypal-order]', err)
    return res.status(500).json({ error: 'Failed to capture payment' })
  }
}
