import type { VercelRequest, VercelResponse } from '@vercel/node'

interface Bucket {
  count: number
  resetAt: number
}

// Per-instance in-memory store — adequate for single-tenant admin use.
// For multi-instance global rate limiting, migrate to Upstash Redis.
const store = new Map<string, Bucket>()

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const bucket = store.get(key)

  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= limit) return false

  bucket.count++
  return true
}

export function clientIp(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string') return xff.split(',')[0].trim()
  if (Array.isArray(xff)) return xff[0].trim()
  return (req.headers['x-real-ip'] as string) ?? 'unknown'
}

/** Applies rate limit and sends 429 if exceeded. Returns false when blocked. */
export function rateLimit(
  req: VercelRequest,
  res: VercelResponse,
  opts: { limit: number; windowMs: number; label: string }
): boolean {
  const ip = clientIp(req)
  const key = `${opts.label}:${ip}`
  const allowed = checkRateLimit(key, opts.limit, opts.windowMs)

  if (!allowed) {
    res.setHeader('Retry-After', String(Math.ceil(opts.windowMs / 1000)))
    res.status(429).json({ error: 'Too many requests — please wait and try again.' })
    return false
  }
  return true
}
