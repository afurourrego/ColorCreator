import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { createBitmap, fillRect } from './bitmap.js'
import { encodePng } from './png.js'

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

type Chunk = { type: string; data: Buffer; crcOk: boolean }

/** Minimal PNG chunk reader, used only by these tests. */
function readChunks(png: Buffer): Chunk[] {
  const chunks: Chunk[] = []
  let offset = 8
  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString('ascii')
    const data = png.subarray(offset + 8, offset + 8 + length)
    const declared = png.readUInt32BE(offset + 8 + length)
    chunks.push({ type, data, crcOk: crc32(png.subarray(offset + 4, offset + 8 + length)) === declared })
    offset += 12 + length
  }
  return chunks
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
  }
  return (crc ^ 0xffffffff) >>> 0
}

describe('createBitmap and fillRect', () => {
  it('fills the whole canvas with the background', () => {
    const bmp = createBitmap(3, 2, [10, 20, 30])
    expect(bmp.data).toHaveLength(3 * 2 * 4)
    expect([...bmp.data.subarray(0, 4)]).toEqual([10, 20, 30, 255])
  })

  it('paints only inside the rectangle', () => {
    const bmp = createBitmap(4, 4, [0, 0, 0])
    fillRect(bmp, 1, 1, 2, 2, [255, 0, 0])
    const px = (x: number, y: number) => [...bmp.data.subarray((y * 4 + x) * 4, (y * 4 + x) * 4 + 3)]
    expect(px(1, 1)).toEqual([255, 0, 0])
    expect(px(2, 2)).toEqual([255, 0, 0])
    expect(px(0, 0)).toEqual([0, 0, 0])
    expect(px(3, 3)).toEqual([0, 0, 0])
  })

  it('clips a rectangle that runs off the edge instead of corrupting neighbours', () => {
    const bmp = createBitmap(3, 3, [0, 0, 0])
    fillRect(bmp, 2, 2, 10, 10, [1, 2, 3])
    const last = [...bmp.data.subarray(8 * 4, 8 * 4 + 3)]
    expect(last).toEqual([1, 2, 3])
    // The row above must be untouched — a missing clip shows up as wraparound.
    expect([...bmp.data.subarray(5 * 4, 5 * 4 + 3)]).toEqual([0, 0, 0])
  })
})

describe('encodePng', () => {
  it('starts with the PNG signature', () => {
    const png = encodePng(createBitmap(2, 2, [0, 0, 0]))
    expect(png.subarray(0, 8).equals(SIGNATURE)).toBe(true)
  })

  it('emits IHDR, IDAT and IEND in order, all with valid CRCs', () => {
    const chunks = readChunks(encodePng(createBitmap(2, 2, [0, 0, 0])))
    expect(chunks.map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND'])
    for (const c of chunks) expect(c.crcOk).toBe(true)
  })

  it('describes the image correctly in IHDR', () => {
    const chunks = readChunks(encodePng(createBitmap(7, 3, [0, 0, 0])))
    const ihdr = chunks[0]!.data
    expect(ihdr.readUInt32BE(0)).toBe(7)
    expect(ihdr.readUInt32BE(4)).toBe(3)
    expect(ihdr[8]).toBe(8) // bit depth
    expect(ihdr[9]).toBe(6) // colour type: RGBA
    expect(ihdr[10]).toBe(0) // deflate
    expect(ihdr[11]).toBe(0) // adaptive filtering
    expect(ihdr[12]).toBe(0) // no interlace
  })

  it('round-trips the exact pixels that were written', () => {
    const bmp = createBitmap(3, 2, [10, 20, 30])
    fillRect(bmp, 0, 0, 1, 1, [200, 100, 50])
    const chunks = readChunks(encodePng(bmp))
    const raw = inflateSync(chunks[1]!.data)
    // Each scanline is one filter byte followed by width * 4 bytes of RGBA.
    expect(raw).toHaveLength(2 * (1 + 3 * 4))
    expect(raw[0]).toBe(0) // filter type 0 (none)
    expect([...raw.subarray(1, 5)]).toEqual([200, 100, 50, 255])
    expect([...raw.subarray(5, 9)]).toEqual([10, 20, 30, 255])
    expect(raw[13]).toBe(0) // second scanline's filter byte
  })
})
