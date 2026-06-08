'use strict'

/**
 * Generates Orizon Press PWA icons with ◈ symbol.
 * Run: node public/icons/generate-icons.cjs
 *
 * Pure Node.js — no external dependencies.
 * ◈ (U+25C8) is drawn using L1/Manhattan distance which
 * naturally produces diamond shapes, with smooth anti-aliasing.
 */

const zlib = require('zlib')
const fs   = require('fs')
const path = require('path')

// ── CRC32 ────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// ── PNG helpers ───────────────────────────────────────────────────────────────

function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t   = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}

function buildPNG(size, pixels) {
  // pixels: Uint8Array of size*size*3 (RGB, row-major)
  const rowLen = 1 + size * 3
  const raw    = Buffer.alloc(size * rowLen)
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0                           // filter: None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 3
      const dst = y * rowLen + 1 + x * 3
      raw[dst]     = pixels[src]
      raw[dst + 1] = pixels[src + 1]
      raw[dst + 2] = pixels[src + 2]
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // color type: RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function smoothstep(lo, hi, x) {
  const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)))
  return t * t * (3 - 2 * t)
}

/**
 * Render ◈ on a gold background into an RGB pixel buffer.
 *
 * The diamond shapes are derived from the L1 (Manhattan) metric:
 *   d = |x - cx| + |y - cy|
 * is a diamond, just as |x|+|y| ≤ r is a filled rotated square.
 *
 * ◈ consists of:
 *   - An outer diamond ring (hollow, white stroke)
 *   - A small filled diamond in the center (white)
 */
function renderIcon(size) {
  const pixels = new Uint8Array(size * size * 3)

  // Background: #C4862A
  const [bgR, bgG, bgB] = [196, 134, 42]
  // Symbol: white
  const [fgR, fgG, fgB] = [255, 255, 255]

  const cx = size / 2
  const cy = size / 2

  // Geometry — all in L1 pixel units
  // 10% safe-area padding → design fills inner 80% → rOuter ≈ 40% of half-size
  const rOuter  = size * 0.370          // outer radius of the diamond ring
  const strokeW = Math.max(size * 0.046, 3) // stroke width, min 3px
  const rInner  = rOuter - strokeW      // inner radius of the diamond ring
  const rCenter = rOuter * 0.240        // radius of the small center diamond
  const aa      = 1.0                   // anti-alias softness (pixels)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Sample at pixel centre (+0.5)
      const d = Math.abs(x + 0.5 - cx) + Math.abs(y + 0.5 - cy)

      // Diamond ring: pixels between rInner and rOuter
      const outerFade = 1 - smoothstep(rOuter - aa, rOuter + aa, d)
      const innerFade = smoothstep(rInner - aa, rInner + aa, d)
      const ring = outerFade * innerFade

      // Small filled center diamond
      const center = 1 - smoothstep(rCenter - aa, rCenter + aa, d)

      // Combine — clamp to [0, 1]
      const t = Math.min(1, ring + center)

      const i = (y * size + x) * 3
      pixels[i]     = Math.round(bgR + (fgR - bgR) * t)
      pixels[i + 1] = Math.round(bgG + (fgG - bgG) * t)
      pixels[i + 2] = Math.round(bgB + (fgB - bgB) * t)
    }
  }

  return pixels
}

// ── Main ──────────────────────────────────────────────────────────────────────

const outDir = __dirname

for (const size of [192, 512]) {
  const pixels = renderIcon(size)
  const png    = buildPNG(size, pixels)
  const file   = path.join(outDir, `icon-${size}.png`)
  fs.writeFileSync(file, png)
  console.log(`✓ icon-${size}.png  (${size}×${size}, ${(png.length / 1024).toFixed(1)} KB)`)
}

console.log('\nDone. Icons written to', outDir)
console.log('Replace with professionally designed assets before launch.')
