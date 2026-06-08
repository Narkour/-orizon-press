/**
 * Generates placeholder PWA icons for Orizon Press.
 * Run once: node public/icons/generate-icons.js
 * Replace icon-192.png and icon-512.png with properly designed assets before launch.
 *
 * Design spec:
 *   Background: #C4862A (Orizon gold)
 *   Symbol:     ◈ centered, white
 *   Safe area:  leave ~10% padding for maskable icon crop
 */

const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function crc32(buf) {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    table[i] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crcVal = Buffer.alloc(4)
  crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crcVal])
}

function solidPNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  const rowLen = 1 + size * 3
  const raw = Buffer.alloc(size * rowLen)
  for (let y = 0; y < size; y++) {
    const base = y * rowLen
    raw[base] = 0  // filter: None
    for (let x = 0; x < size; x++) {
      raw[base + 1 + x * 3]     = r
      raw[base + 1 + x * 3 + 1] = g
      raw[base + 1 + x * 3 + 2] = b
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const dir = path.dirname(__filename)
// Orizon gold: #C4862A = rgb(196, 134, 42)
fs.writeFileSync(path.join(dir, 'icon-192.png'), solidPNG(192, 196, 134, 42))
fs.writeFileSync(path.join(dir, 'icon-512.png'), solidPNG(512, 196, 134, 42))
console.log('Generated icon-192.png and icon-512.png in', dir)
console.log('Replace with properly designed icons before launch.')
