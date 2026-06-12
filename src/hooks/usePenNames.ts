import { useState, useEffect } from 'react'
import type { PenName, Genre } from '../data/catalogue'
import { penNames as staticPenNames } from '../data/catalogue'

interface DbPenName {
  id: string
  slug: string
  name: string
  bio: string
  short_bio: string
  genres: string[]
  accent_color: string
}

function mapPenName(row: DbPenName): PenName {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    bio: row.bio || 'Bio coming soon.',
    shortBio: row.short_bio || 'A writer at Orizon Press.',
    genres: (row.genres ?? []) as Genre[],
    accentColor: row.accent_color || '#8B7355',
  }
}

let cache: PenName[] | null = null
let inflight: Promise<PenName[]> | null = null

async function loadPenNames(): Promise<PenName[]> {
  try {
    const res = await fetch('/api/books?resource=pen-names')
    if (!res.ok) return staticPenNames
    const rows: DbPenName[] = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) return staticPenNames
    const mapped = rows.map(mapPenName)
    // Append any static pen names not present in the DB (safety net)
    const dbIds = new Set(mapped.map(p => p.id))
    for (const sp of staticPenNames) {
      if (!dbIds.has(sp.id)) mapped.push(sp)
    }
    return mapped
  } catch {
    return staticPenNames
  }
}

export function bustPenNamesCache() {
  cache = null
  inflight = null
}

export function usePenNames() {
  const [penNames, setPenNames] = useState<PenName[]>(cache ?? staticPenNames)
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    if (cache) { setPenNames(cache); setLoading(false); return }
    if (!inflight) inflight = loadPenNames()
    inflight
      .then(data => { cache = data; setPenNames(data) })
      .catch(() => setPenNames(staticPenNames))
      .finally(() => setLoading(false))
  }, [])

  return { penNames, loading }
}
