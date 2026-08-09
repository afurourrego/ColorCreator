import type { Bitmap, Rgb } from './bitmap.js'
import { fillRect } from './bitmap.js'

export const GLYPH_WIDTH = 5
export const GLYPH_HEIGHT = 7
/** One blank column between glyphs. */
const GLYPH_SPACING = 1

/**
 * A 5x7 uppercase bitmap font, drawn here rather than loaded from a font file.
 *
 * The contact sheet needs about forty characters at a fixed size, and every
 * alternative — node-canvas, resvg, sharp — is a native binary of tens of
 * megabytes that compiles on install. A kilobyte of table is the cheaper trade,
 * and pixel type is the right register for a BasePaint tool anyway.
 */
const GLYPHS: Record<string, string[]> = {
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '####.', '#...#', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '####.', '#....', '#....', '#....', '#####'],
  F: ['#####', '#....', '####.', '#....', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#...#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#..##', '#.#.#', '#.#.#', '#.#.#', '##..#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  ',': ['.....', '.....', '.....', '.....', '.....', '..#..', '.#...'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
  ':': ['.....', '.....', '..#..', '.....', '.....', '..#..', '.....'],
  '·': ['.....', '.....', '.....', '..#..', '.....', '.....', '.....'],
}

for (const [char, rows] of Object.entries(GLYPHS)) {
  if (rows.length !== GLYPH_HEIGHT || rows.some((r) => r.length !== GLYPH_WIDTH)) {
    throw new Error(`glyph "${char}" is not ${GLYPH_WIDTH}x${GLYPH_HEIGHT}`)
  }
}

export const SUPPORTED_CHARS = Object.keys(GLYPHS).join('')

/** Every unsupported character renders as this, so gaps are visible, not silent. */
const TOFU = ['#####', '#...#', '#...#', '#...#', '#...#', '#...#', '#####']

/** Width in pixels of `text` at `scale`, excluding the trailing inter-glyph gap. */
export function textWidth(text: string, scale: number): number {
  if (text.length === 0) return 0
  return (text.length * (GLYPH_WIDTH + GLYPH_SPACING) - GLYPH_SPACING) * scale
}

/**
 * Draw `text` with its top-left corner at (x, y). Clipped by fillRect, so text
 * running off the canvas is cropped rather than wrapped or fatal.
 */
export function drawText(
  bmp: Bitmap,
  text: string,
  x: number,
  y: number,
  scale: number,
  color: Rgb,
): void {
  const advance = (GLYPH_WIDTH + GLYPH_SPACING) * scale
  ;[...text.toUpperCase()].forEach((char, index) => {
    const glyph = GLYPHS[char] ?? TOFU
    const originX = x + index * advance
    for (let row = 0; row < GLYPH_HEIGHT; row++) {
      const line = glyph[row]!
      for (let col = 0; col < GLYPH_WIDTH; col++) {
        if (line[col] === '#') {
          fillRect(bmp, originX + col * scale, y + row * scale, scale, scale, color)
        }
      }
    }
  })
}
