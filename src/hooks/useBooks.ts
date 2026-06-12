import { useState, useEffect } from 'react'
import type { Book } from '../data/catalogue'
import { fetchBooks } from '../lib/books'

// Module-level cache so navigating between pages doesn't re-fetch
let cache: Book[] | null = null
let inflight: Promise<Book[]> | null = null

export function bustBooksCache() {
  cache = null
  inflight = null
}

export function useBooks() {
  const [books, setBooks] = useState<Book[]>(cache ?? [])
  const [loading, setLoading] = useState(!cache)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cache) return

    if (!inflight) inflight = fetchBooks()

    inflight
      .then(data => { cache = data; setBooks(data) })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load books'))
      .finally(() => setLoading(false))
  }, [])

  return { books, loading, error }
}
