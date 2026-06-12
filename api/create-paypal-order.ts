import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Client, Environment, OrdersController, CheckoutPaymentIntent } from '@paypal/paypal-server-sdk'
import { rateLimit } from './_lib/rate-limit.js'

const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID!,
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET!,
  },
  environment: Environment.Production,
})

const ordersController = new OrdersController(paypalClient)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 10 order attempts per IP per 15 minutes
  if (!rateLimit(req, res, { limit: 10, windowMs: 15 * 60_000, label: 'create-order' })) return

  const { bookSlug, bookTitle, amount, buyerEmail, orderType } = req.body ?? {}

  if (!bookSlug || !bookTitle || !amount || !buyerEmail) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const parsedAmount = parseFloat(amount)
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' })
  }

  try {
    const { result } = await ordersController.createOrder({
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: {
              currencyCode: 'USD',
              value: parsedAmount.toFixed(2),
            },
            description: `${bookTitle} (${orderType === 'audiobook' ? 'Audiobook' : 'eBook'})`,
            customId: `${bookSlug}|${buyerEmail}|${orderType ?? 'ebook'}`,
          },
        ],
      },
      prefer: 'return=representation',
    })

    return res.status(200).json({ orderId: result.id })
  } catch (err) {
    console.error('[create-paypal-order]', err)
    return res.status(500).json({ error: 'Failed to create PayPal order' })
  }
}
