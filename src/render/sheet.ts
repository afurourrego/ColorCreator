import { hexToRgb } from '../core/oklch.js'
import type { Candidate } from '../core/types.js'
import type { Bitmap, Rgb } from './bitmap.js'
import { createBitmap, fillRect } from './bitmap.js'
import { GLYPH_HEIGHT, drawText, textWidth } from './font.js'

/**
 * Contact-sheet width in pixels.
 *
 * A layout choice, not a measurement, so it lives with the other sheet
 * dimensions rather than among the calibrated constants in core/.
 */
export const SHEET_WIDTH = 1024

const BACKGROUND: Rgb = [14, 17, 22]
const TEXT: Rgb = [230, 233, 239]
const MUTED: Rgb = [138, 147, 163]

const MARGIN = 24
const LABEL_SCALE = 3
const HEX_SCALE = 2
const BAND_HEIGHT = 72
const GAP = 10
const BLOCK_GAP = 26

/**
 * Exported so tests can verify the hex-wrap budget against the real content
 * width instead of duplicating MARGIN as a literal (which could silently
 * drift from this file).
 */
export const CONTENT_WIDTH = SHEET_WIDTH - MARGIN * 2
const LABEL_HEIGHT = GLYPH_HEIGHT * LABEL_SCALE
const HEX_LINE_HEIGHT = GLYPH_HEIGHT * HEX_SCALE
const HEX_LINE_GAP = 4
/** Characters that fit on one hex line at HEX_SCALE. */
export const HEX_CHARS_PER_LINE = Math.floor(CONTENT_WIDTH / (6 * HEX_SCALE))

/**
 * Break the comma-joined palette into lines of at most `maxChars`, splitting
 * only after a comma.
 *
 * A 16-colour palette is 127 characters and does not fit on one line at any
 * legible scale, so wrapping is required rather than optional. Breaking
 * mid-colour would produce hex codes that cannot be copied, which defeats the
 * point of printing them.
 */
export function wrapPaletteText(colors: string[], maxChars: number): string[] {
  const lines: string[] = []
  let current = ''
  colors.forEach((color, index) => {
    const token = index === colors.length - 1 ? color : `${color},`
    if (current.length > 0 && current.length + token.length > maxChars) {
      lines.push(current)
      current = ''
    }
    current += token
  })
  if (current.length > 0) lines.push(current)
  return lines
}

function blockHeight(candidate: Candidate): number {
  // Clamped to at least 1: a Candidate's colors are always 2-16 in practice, so
  // wrapPaletteText always returns at least one line, but the type doesn't
  // enforce non-emptiness — an empty palette would otherwise make (hexLines - 1)
  // negative below, for no good reason.
  const hexLines = Math.max(1, wrapPaletteText(candidate.colors, HEX_CHARS_PER_LINE).length)
  return (
    LABEL_HEIGHT +
    GAP +
    BAND_HEIGHT +
    GAP +
    hexLines * HEX_LINE_HEIGHT +
    (hexLines - 1) * HEX_LINE_GAP
  )
}

/**
 * The whole day's candidates as one image, for comparing at a glance.
 *
 * Laid out in two passes — measure every block, then draw — because block
 * height depends on how many lines the hex codes wrap to, which depends on the
 * palette size. Computing the canvas height up front is the only way to avoid
 * either guessing or reallocating mid-draw.
 */
export function renderContactSheet(day: number, candidates: Candidate[]): Bitmap {
  const header = `BASEPAINT · DAY ${day} · ${candidates.length} CANDIDATES`
  const headerHeight = LABEL_HEIGHT + BLOCK_GAP

  const heights = candidates.map(blockHeight)
  const totalHeight =
    MARGIN * 2 +
    headerHeight +
    heights.reduce((sum, h) => sum + h + BLOCK_GAP, 0) -
    (candidates.length > 0 ? BLOCK_GAP : 0)

  const bmp = createBitmap(SHEET_WIDTH, totalHeight, BACKGROUND)

  let y = MARGIN
  drawText(bmp, header, MARGIN, y, LABEL_SCALE, TEXT)
  y += headerHeight

  candidates.forEach((candidate, index) => {
    drawText(bmp, candidate.strategy, MARGIN, y, LABEL_SCALE, TEXT)
    const scoreText = String(candidate.score)
    drawText(
      bmp,
      scoreText,
      SHEET_WIDTH - MARGIN - textWidth(scoreText, LABEL_SCALE),
      y,
      LABEL_SCALE,
      MUTED,
    )
    y += LABEL_HEIGHT + GAP

    // Bands are laid out on exact fractional boundaries and rounded by fillRect,
    // so the last one lands on the right margin instead of drifting by k pixels.
    const bandWidth = CONTENT_WIDTH / candidate.colors.length
    candidate.colors.forEach((hex, i) => {
      const x0 = MARGIN + bandWidth * i
      const x1 = MARGIN + bandWidth * (i + 1)
      fillRect(bmp, x0, y, x1 - x0, BAND_HEIGHT, hexToRgb(hex))
    })
    y += BAND_HEIGHT + GAP

    for (const line of wrapPaletteText(candidate.colors, HEX_CHARS_PER_LINE)) {
      drawText(bmp, line, MARGIN, y, HEX_SCALE, MUTED)
      y += HEX_LINE_HEIGHT + HEX_LINE_GAP
    }
    y += BLOCK_GAP - HEX_LINE_GAP
    if (index === candidates.length - 1) y -= BLOCK_GAP
  })

  // The vertical layout is computed twice — once up front to size the canvas
  // (totalHeight), once while drawing (y) — and the two must land on the same
  // number or blocks silently overlap or the sheet grows a ragged bottom
  // margin. Cheap to check, expensive to debug visually, so it always runs.
  if (y !== totalHeight - MARGIN) {
    throw new Error(
      `contact sheet layout drift: drawing cursor ended at ${y}, expected ${totalHeight - MARGIN}`,
    )
  }

  return bmp
}
