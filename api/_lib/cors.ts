import type { VercelRequest, VercelResponse } from '@vercel/node'

const SITE_ORIGIN = 'https://orizonpress.com'

export function setCors(res: VercelResponse, origin = '*'): void {
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export function setCorsRestricted(res: VercelResponse): void {
  setCors(res, SITE_ORIGIN)
  res.setHeader('Vary', 'Origin')
}

/** Returns false when the request is an OPTIONS preflight — caller must return immediately. */
export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return false
  }
  return true
}
