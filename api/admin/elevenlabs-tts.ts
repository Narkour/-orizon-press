/**
 * POST /api/admin/elevenlabs-tts
 * Generates MP3 narration for a book using ElevenLabs TTS, then stores it
 * in Supabase Storage (ebooks bucket, audio/{slug}.mp3) and updates the
 * book record's audio_path column.
 *
 * Body: { slug, text, voiceId? }
 *   text — max 5 000 characters (one chapter or a sample)
 *
 * Requires env: ELEVENLABS_API_KEY
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

export const maxDuration = 60
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/admin-auth.js'
import { rateLimit } from '../_lib/rate-limit.js'

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'
const MAX_CHARS = 5_000

// Curated narrative voices for audiobooks
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireAdmin(req, res)) return
  if (!rateLimit(req, res, { limit: 10, windowMs: 60 * 60_000, label: 'elevenlabs' })) return

  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(501).json({ error: 'ELEVENLABS_API_KEY not configured. Add it to Vercel environment variables.' })
  }

  const { slug, text, voiceId } = req.body ?? {}

  if (!slug || !text) {
    return res.status(400).json({ error: 'Required fields: slug, text' })
  }
  if (typeof text !== 'string' || text.length > MAX_CHARS) {
    return res.status(400).json({ error: `Text must be under ${MAX_CHARS} characters (currently ${text?.length ?? 0}).` })
  }

  const voice = typeof voiceId === 'string' && voiceId ? voiceId : DEFAULT_VOICE

  // ── 1. Generate audio via ElevenLabs ─────────────────────────────────────────
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

  // ── 2. Upload to Supabase Storage ─────────────────────────────────────────────
  const audioPath = `audio/${slug}.mp3`
  const { error: storageErr } = await supabase.storage
    .from('ebooks')
    .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg', upsert: true })

  if (storageErr) {
    console.error('[elevenlabs-tts] Storage error:', storageErr)
    return res.status(500).json({ error: `Storage upload failed: ${storageErr.message}` })
  }

  // ── 3. Update book record ─────────────────────────────────────────────────────
  await supabase
    .from('books')
    .update({ audio_path: audioPath, updated_at: new Date().toISOString() })
    .eq('slug', slug)

  const sizeMb = (audioBuffer.length / 1_048_576).toFixed(2)
  return res.status(200).json({ audioPath, sizeMb, chars: text.length })
}
