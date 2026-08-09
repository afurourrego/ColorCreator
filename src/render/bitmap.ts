import type { Rgb } from '../core/types.js'

export type { Rgb }

/** An RGBA image buffer, row-major, 4 bytes per pixel. */
export type Bitmap = {
  width: number
  height: number
  data: Uint8Array
}

export function createBitmap(width: number, height: number, fill: Rgb): Bitmap {
  const data = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill[0]
    data[i * 4 + 1] = fill[1]
    data[i * 4 + 2] = fill[2]
    data[i * 4 + 3] = 255
  }
  return { width, height, data }
}

/**
 * Paint an axis-aligned rectangle, clipped to the canvas.
 *
 * Clipping rather than throwing: layout code computes a lot of rectangles from
 * text widths and palette sizes, and one that overhangs by a pixel should
 * produce a slightly cropped sheet, not a crash. Without the clip an overhang
 * wraps onto the next row, which looks like a layout bug somewhere else
 * entirely.
 */
export function fillRect(
  bmp: Bitmap,
  x: number,
  y: number,
  w: number,
  h: number,
  color: Rgb,
): void {
  const x0 = Math.max(0, Math.round(x))
  const y0 = Math.max(0, Math.round(y))
  const x1 = Math.min(bmp.width, Math.round(x + w))
  const y1 = Math.min(bmp.height, Math.round(y + h))
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const i = (py * bmp.width + px) * 4
      bmp.data[i] = color[0]
      bmp.data[i + 1] = color[1]
      bmp.data[i + 2] = color[2]
      bmp.data[i + 3] = 255
    }
  }
}
