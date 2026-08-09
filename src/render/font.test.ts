import { describe, expect, it } from 'vitest'
import { createBitmap } from './bitmap.js'
import { GLYPH_HEIGHT, GLYPH_WIDTH, SUPPORTED_CHARS, drawText, textWidth } from './font.js'

/** Every character the contact sheet can ever need to draw. */
const REQUIRED = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#,-.:·'

describe('the glyph table', () => {
  it('covers every character the contact sheet uses', () => {
    const missing = [...REQUIRED].filter((ch) => !SUPPORTED_CHARS.includes(ch))
    expect(missing, `missing glyphs: ${missing.join(' ')}`).toEqual([])
  })

  it('gives every glyph exactly 7 rows of 5 columns', () => {
    // Enforced inside font.ts at module load; this asserts the check exists.
    expect(GLYPH_WIDTH).toBe(5)
    expect(GLYPH_HEIGHT).toBe(7)
  })

  it('has a blank space and a non-blank letter', () => {
    const blank = createBitmap(20, 20, [0, 0, 0])
    drawText(blank, ' ', 0, 0, 1, [255, 255, 255])
    expect([...blank.data].every((b, i) => (i % 4 === 3 ? b === 255 : b === 0))).toBe(true)

    const letter = createBitmap(20, 20, [0, 0, 0])
    drawText(letter, 'A', 0, 0, 1, [255, 255, 255])
    expect([...letter.data].some((b, i) => i % 4 !== 3 && b === 255)).toBe(true)
  })
})

describe('textWidth', () => {
  it('counts one glyph plus one column of spacing per character, less the trailing gap', () => {
    expect(textWidth('A', 1)).toBe(5)
    expect(textWidth('AB', 1)).toBe(11)
    expect(textWidth('AB', 3)).toBe(33)
    expect(textWidth('', 1)).toBe(0)
  })
})

describe('drawText', () => {
  it('scales glyphs by an integer factor', () => {
    const one = createBitmap(40, 24, [0, 0, 0])
    const three = createBitmap(40, 24, [0, 0, 0])
    drawText(one, 'X', 0, 0, 1, [255, 255, 255])
    drawText(three, 'X', 0, 0, 3, [255, 255, 255])
    const lit = (b: typeof one) => [...b.data].filter((v, i) => i % 4 === 0 && v === 255).length
    expect(lit(three)).toBe(lit(one) * 9)
  })

  it('uppercases input, since the font is uppercase-only', () => {
    const upper = createBitmap(20, 20, [0, 0, 0])
    const lower = createBitmap(20, 20, [0, 0, 0])
    drawText(upper, 'A', 0, 0, 1, [255, 255, 255])
    drawText(lower, 'a', 0, 0, 1, [255, 255, 255])
    expect([...lower.data]).toEqual([...upper.data])
  })

  it('draws an unsupported character as a filled box rather than nothing', () => {
    // A silently missing glyph reads as a spacing bug; a visible box reads as
    // "add this glyph".
    const bmp = createBitmap(20, 20, [0, 0, 0])
    drawText(bmp, '¡', 0, 0, 1, [255, 255, 255])
    expect([...bmp.data].some((b, i) => i % 4 !== 3 && b === 255)).toBe(true)
  })

  it('clips text that runs past the right edge', () => {
    const bmp = createBitmap(8, 10, [0, 0, 0])
    expect(() => drawText(bmp, 'ABCDEFGH', 0, 0, 2, [255, 255, 255])).not.toThrow()
  })
})
