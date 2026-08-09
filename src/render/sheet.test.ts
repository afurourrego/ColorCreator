import { describe, expect, it } from 'vitest'
import type { Candidate } from '../core/types.js'
import type { Bitmap } from './bitmap.js'
import {
  CONTENT_WIDTH,
  HEX_CHARS_PER_LINE,
  SHEET_WIDTH,
  renderContactSheet,
  wrapPaletteText,
} from './sheet.js'

const RAMP: Candidate = {
  strategy: 'smooth-ramp',
  colors: ['#12060f', '#3a1b33', '#7c3a55', '#b86a6b', '#e4a87f', '#f8e3c2'],
  score: 92,
}
const DUO: Candidate = { strategy: 'duotone', colors: ['#0b1a2e', '#fff2d4'], score: 71 }

describe('wrapPaletteText', () => {
  it('keeps a short palette on one line', () => {
    expect(wrapPaletteText(['#000000', '#ffffff'], 40)).toEqual(['#000000,#ffffff'])
  })

  it('breaks only after a comma, never mid-colour', () => {
    const colors = Array.from({ length: 16 }, (_, i) => `#0000${i.toString(16)}${i.toString(16)}`)
    for (const line of wrapPaletteText(colors, 30)) {
      for (const token of line.split(',')) {
        if (token.length > 0) expect(token).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })

  it('respects the character budget', () => {
    const colors = Array.from({ length: 16 }, () => '#abcdef')
    for (const line of wrapPaletteText(colors, 30)) expect(line.length).toBeLessThanOrEqual(30)
  })

  it('loses no colours in the wrap', () => {
    const colors = Array.from({ length: 16 }, (_, i) => `#0000${i.toString(16).padStart(2, '0')}`)
    const rejoined = wrapPaletteText(colors, 25).join('').split(',')
    expect(rejoined).toEqual(colors)
  })

  it('emits a single colour on its own line when the budget is tiny', () => {
    expect(wrapPaletteText(['#abcdef', '#123456'], 3)).toEqual(['#abcdef,', '#123456'])
  })
})

describe('renderContactSheet', () => {
  it('is the configured width', () => {
    expect(renderContactSheet(1097, [RAMP]).width).toBe(SHEET_WIDTH)
  })

  it('grows taller with more candidates', () => {
    const one = renderContactSheet(1097, [RAMP]).height
    const three = renderContactSheet(1097, [RAMP, DUO, RAMP]).height
    expect(three).toBeGreaterThan(one)
  })

  it('actually paints the palette colours into the band', () => {
    const bmp = renderContactSheet(1097, [DUO])
    const pixels = new Set<string>()
    for (let i = 0; i < bmp.data.length; i += 4) {
      pixels.add(`${bmp.data[i]},${bmp.data[i + 1]},${bmp.data[i + 2]}`)
    }
    expect(pixels).toContain('11,26,46') // #0b1a2e
    expect(pixels).toContain('255,242,212') // #fff2d4
  })

  it('renders an empty candidate list as a header-only sheet rather than crashing', () => {
    const bmp = renderContactSheet(1097, [])
    expect(bmp.width).toBe(SHEET_WIDTH)
    expect(bmp.height).toBeGreaterThan(0)
  })

  it('is deterministic', () => {
    expect([...renderContactSheet(1097, [RAMP, DUO]).data]).toEqual(
      [...renderContactSheet(1097, [RAMP, DUO]).data],
    )
  })
})

/**
 * The vertical layout is computed twice — once to size the canvas, once while
 * drawing — and sheet.ts asserts internally that the two agree (throwing
 * `contact sheet layout drift` otherwise). These tests exercise enough
 * candidate counts and palette sizes, including every k from 2 to 16 (which
 * changes how many lines the hex codes wrap to), that a drift in either
 * calculation would trip the assertion rather than silently overlapping
 * blocks or leaving a ragged bottom margin.
 */
describe('vertical layout closure', () => {
  function candidateWithSize(k: number): Candidate {
    return {
      strategy: `k${k}`,
      colors: Array.from({ length: k }, (_, i) => `#${(i % 16).toString(16).repeat(6)}`),
      score: k,
    }
  }

  it.each([0, 1, 2, 3, 5, 8])('does not drift for %i candidates of mixed sizes', (count) => {
    const candidates = Array.from({ length: count }, (_, i) => candidateWithSize(2 + (i % 15)))
    expect(() => renderContactSheet(1097, candidates)).not.toThrow()
  })

  it.each(Array.from({ length: 15 }, (_, i) => i + 2))(
    'does not drift for a single %i-colour palette',
    (k) => {
      expect(() => renderContactSheet(1097, [candidateWithSize(k)])).not.toThrow()
    },
  )
})

/**
 * Bands are computed on fractional boundaries (MARGIN + bandWidth * i) and
 * rounded by fillRect. Verified black-box: scan the rendered pixels rather
 * than reaching into sheet.ts's private constants, so the test still holds if
 * MARGIN or BAND_HEIGHT are retuned.
 */
describe('swatch band edges', () => {
  const BACKGROUND = '14,17,22'
  // Derived, not copied: retuning MARGIN in sheet.ts moves CONTENT_WIDTH with
  // it, so this test keeps measuring the real margin instead of a stale 24.
  const MARGIN = (SHEET_WIDTH - CONTENT_WIDTH) / 2

  function rowPixels(bmp: Bitmap, y: number): string[] {
    const pixels: string[] = []
    for (let x = 0; x < bmp.width; x++) {
      const i = (y * bmp.width + x) * 4
      pixels.push(`${bmp.data[i]},${bmp.data[i + 1]},${bmp.data[i + 2]}`)
    }
    return pixels
  }

  it.each([2, 3, 7, 16])('for k=%i is flush to both margins and has no gaps', (k) => {
    // Saturated, mutually distinct colours that cannot be confused with the
    // sheet's background/text/muted greys.
    const colors = Array.from({ length: k }, (_, i) => {
      const r = (255 - i * 8).toString(16).padStart(2, '0')
      return `#${r}0000`
    })
    const candidate: Candidate = { strategy: 'probe', colors, score: 0 }
    const bmp = renderContactSheet(1097, [candidate])

    // Find a row inside the band: the first row containing the first colour.
    const targetPixel = `${255 - 0 * 8},0,0`
    let bandY = -1
    for (let y = 0; y < bmp.height; y++) {
      if (rowPixels(bmp, y).includes(targetPixel)) {
        bandY = y
        break
      }
    }
    expect(bandY).toBeGreaterThanOrEqual(0)

    const row = rowPixels(bmp, bandY)
    const leftEdge = row.findIndex((p) => p !== BACKGROUND)
    const rightEdge = row.length - 1 - [...row].reverse().findIndex((p) => p !== BACKGROUND)

    expect(leftEdge).toBeGreaterThanOrEqual(0)
    // Margins are symmetric: flush-left offset mirrors flush-right offset.
    expect(leftEdge).toBe(row.length - 1 - rightEdge)
    // Flush to sheet.ts's real margin on both sides.
    expect(leftEdge).toBe(MARGIN)
    expect(rightEdge).toBe(SHEET_WIDTH - MARGIN - 1)

    // No background pixel sneaks in between adjacent swatches.
    for (let x = leftEdge; x <= rightEdge; x++) expect(row[x]).not.toBe(BACKGROUND)

    // Every colour actually made it into the band, none lost to rounding.
    for (let i = 0; i < k; i++) {
      const expected = `${255 - i * 8},0,0`
      expect(row).toContain(expected)
    }
  })
})

/**
 * HEX_CHARS_PER_LINE and CONTENT_WIDTH are imported directly from sheet.ts —
 * not re-derived from copied MARGIN/HEX_SCALE literals, which could silently
 * drift from whatever sheet.ts actually uses. This packs a palette's hex line
 * as close to the real HEX_CHARS_PER_LINE budget as greedy wrapping allows
 * (the tightest case the budget is meant to guarantee still fits), then
 * measures the *real rendered pixels* of that line's bounding box against the
 * *real content-area bounds*. A HEX_CHARS_PER_LINE computed too large would
 * show up here as text overrunning the right edge of the content area — the
 * "silently clipped by fillRect" failure mode named in the brief's risks.
 */
describe('hex text fits the content width', () => {
  const MARGIN = (SHEET_WIDTH - CONTENT_WIDTH) / 2
  const BACKGROUND = '14,17,22'
  const MUTED = '138,147,163'

  function rowPixels(bmp: Bitmap, y: number): string[] {
    const pixels: string[] = []
    for (let x = 0; x < bmp.width; x++) {
      const i = (y * bmp.width + x) * 4
      pixels.push(`${bmp.data[i]},${bmp.data[i + 1]},${bmp.data[i + 2]}`)
    }
    return pixels
  }

  it('a hex line packed to the real HEX_CHARS_PER_LINE budget renders unclipped', () => {
    const pool = Array.from({ length: 32 }, (_, i) => `#${(i % 16).toString(16).repeat(6)}`)
    const [firstLine] = wrapPaletteText(pool, HEX_CHARS_PER_LINE)
    const packedColors = firstLine!.split(',').filter((token) => token.length > 0)
    // Sanity: the greedy wrap actually packed more than a token or two — this
    // is meant to be the tight case, not an accidentally short one.
    expect(packedColors.length).toBeGreaterThan(1)

    const candidate: Candidate = { strategy: 'probe', colors: packedColors, score: 0 }
    const bmp = renderContactSheet(1097, [candidate])

    // MUTED also draws the score digits (above the band); group the rows that
    // contain it into runs and take the last run — the hex line always comes
    // after the band, which always comes after the score.
    const mutedRows: number[] = []
    for (let y = 0; y < bmp.height; y++) {
      if (rowPixels(bmp, y).includes(MUTED)) mutedRows.push(y)
    }
    const runs: number[][] = []
    for (const y of mutedRows) {
      const current = runs.at(-1)
      if (current && y === current.at(-1)! + 1) current.push(y)
      else runs.push([y])
    }
    const hexLineRows = runs.at(-1)
    expect(hexLineRows).toBeDefined()

    let left = Infinity
    let right = -Infinity
    for (const y of hexLineRows!) {
      const row = rowPixels(bmp, y)
      left = Math.min(left, row.findIndex((p) => p !== BACKGROUND))
      right = Math.max(right, row.length - 1 - [...row].reverse().findIndex((p) => p !== BACKGROUND))
    }

    expect(left).toBeGreaterThanOrEqual(MARGIN)
    expect(right).toBeLessThanOrEqual(MARGIN + CONTENT_WIDTH - 1)
  })
})
