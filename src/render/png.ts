import { deflateSync } from 'node:zlib'
import type { Bitmap } from './bitmap.js'

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** length | type | data | crc(type + data) */
function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([length, typeAndData, crc])
}

/**
 * Encode an RGBA bitmap as a PNG.
 *
 * Filter type 0 (none) on every scanline. The adaptive filters would compress
 * better on photographs; a contact sheet is flat colour blocks, where deflate
 * already does the work and picking filters per row would only add a heuristic
 * to get wrong.
 */
export function encodePng(bmp: Bitmap): Buffer {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(bmp.width, 0)
  ihdr.writeUInt32BE(bmp.height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: truecolour with alpha
  ihdr[10] = 0 // compression: deflate
  // Filter *method*, not filter type: 0 is the only value PNG defines here.
  // The per-scanline filter type is the leading byte of each row below, and
  // this encoder always writes 0 (None) there.
  ihdr[11] = 0
  ihdr[12] = 0 // interlace: none

  const stride = bmp.width * 4
  const raw = Buffer.alloc(bmp.height * (stride + 1))
  for (let y = 0; y < bmp.height; y++) {
    raw[y * (stride + 1)] = 0
    Buffer.from(bmp.data.buffer, bmp.data.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    )
  }

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
