import type { Book, AudioChapter } from '../data/catalogue'

export interface DbBook {
  id: string
  slug: string
  title: string
  author: string
  pen_name_id: string
  genre: string
  description: string
  short_description: string
  cover_url: string
  pdf_path: string
  price: number
  available: boolean
  featured?: boolean
  sample_text: string | null
  audio_price: number | null
  audio_available: boolean | null
  audio_chapters: AudioChapter[] | null
  created_at: string
  updated_at: string
  language?: string | null
}

export function mapBook(row: DbBook): Book {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: row.author,
    penNameId: row.pen_name_id,
    genre: row.genre as Book['genre'],
    description: row.description || '',
    shortDescription: row.short_description || '',
    coverColor: '#1a1200',
    coverImage: row.cover_url || undefined,
    featured: row.featured ?? false,
    ebook: {
      available: row.available && !!row.pdf_path,
      price: Number(row.price),
    },
    print: { available: true, price: 16.99 },
    audiobook: {
      available: row.audio_available ?? false,
      price: row.audio_price ? Number(row.audio_price) : null,
      chapters: row.audio_chapters ?? [],
    },
    sampleText: row.sample_text ?? undefined,
    language: row.language ?? undefined,
  }
}

export async function fetchBooks(): Promise<Book[]> {
  const res = await fetch('/api/books')
  if (!res.ok) throw new Error('Failed to load catalogue')
  const rows: DbBook[] = await res.json()
  return rows.map(mapBook)
}
