import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/admin-auth.js'

export const maxDuration = 60

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'
const MAX_CHARS = 5_000

export const VOICES: Record<string, string> = {
  'Adam (deep, narrative)':     'pNInz6obpgDQGcFmaJgB',
  'Rachel (clear, female)':     '21m00Tcm4TlvDq8ikWAM',
  'Antoni (storytelling male)': 'ErXwobaYiN019PkySvjV',
  'Charlotte (soft female)':    'XB0fDUnXU5powFXDhCwa',
}
const DEFAULT_VOICE = VOICES['Adam (deep, narrative)']

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

interface AudioChapter {
  index: number
  title: string
  path: string
  url: string
  sizeMb: number
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireAdmin(req, res)) return

  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(501).json({ error: 'ELEVENLABS_API_KEY not configured. Add it to Vercel environment variables.' })
  }

  const { slug, text, voiceId, segmentIndex, segmentTitle } = req.body ?? {}

  if (!slug || !text) return res.status(400).json({ error: 'Required fields: slug, text' })
  if (typeof text !== 'string' || text.length > MAX_CHARS) {
    return res.status(400).json({
      error: `Text must be under ${MAX_CHARS} characters (currently ${text?.length ?? 0}).`,
    })
  }

  const voice = typeof voiceId === 'string' && voiceId ? voiceId : DEFAULT_VOICE
  const isChapterMode = typeof segmentIndex === 'number'

  // ── 1. Generate audio via ElevenLabs ──────────────────────────────────────────
  let audioBuffer: Buffer
  try {
    const elRes = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
      }),
    })

    if (!elRes.ok) {
      const errBody = await elRes.text()
      throw new Error(`ElevenLabs ${elRes.status}: ${errBody}`)
    }

    audioBuffer = Buffer.from(await elRes.arrayBuffer())
  } catch (err) {
    console.error('[elevenlabs-tts] TTS error:', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'TTS generation failed.' })
  }

  // ── 2. Upload to Supabase Storage (`audio` bucket) ────────────────────────────
  const idx = String(segmentIndex ?? 0).padStart(2, '0')
  const audioPath = isChapterMode ? `${slug}/ch-${idx}.mp3` : `${slug}.mp3`

  const { error: storageErr } = await supabase.storage
    .from('audio')
    .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg', upsert: true })

  if (storageErr) {
    console.error('[elevenlabs-tts] Storage error:', storageErr)
    return res.status(500).json({ error: `Storage upload failed: ${storageErr.message}` })
  }

  const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(audioPath)
  const sizeMb = parseFloat((audioBuffer.length / 1_048_576).toFixed(2))

  // ── 3. Update book record ─────────────────────────────────────────────────────
  if (isChapterMode) {
    // Fetch and upsert the chapter list
    const { data: bookData } = await supabase
      .from('books')
      .select('audio_chapters')
      .eq('slug', slug)
      .single()

    const existing: AudioChapter[] = (bookData?.audio_chapters as AudioChapter[] | null) ?? []

    const newChapter: AudioChapter = {
      index: segmentIndex,
      title: typeof segmentTitle === 'string' && segmentTitle
        ? segmentTitle
        : `Segment ${segmentIndex + 1}`,
      path: audioPath,
      url: publicUrl,
      sizeMb,
    }

    const updated = [
      ...existing.filter(c => c.index !== segmentIndex),
      newChapter,
    ].sort((a, b) => a.index - b.index)

    await supabase.from('books').update({ audio_chapters: updated }).eq('slug', slug)

    return res.status(200).json({ segment: newChapter, totalSegments: updated.length })
  }

  // Legacy mode: store single audio path on book
  return res.status(200).json({ audioPath, publicUrl, sizeMb, chars: text.length })
}
