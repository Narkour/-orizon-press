import { timingSafeEqual } from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/** Returns true if request carries a valid admin bearer token. */
export function isAdmin(req: VercelRequest): boolean {
  const auth = req.headers['authorization'] ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const expected = process.env.ADMIN_PASSWORD ?? ''
  if (!token || !expected) return false
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}

export function requireAdmin(req: VercelRequest, res: VercelResponse): boolean {
  if (!isAdmin(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}
