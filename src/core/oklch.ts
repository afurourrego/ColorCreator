import { clampChroma, converter, differenceEuclidean, formatHex } from 'culori'
import type { Oklch, Rgb } from './types.js'

const toOklch = converter('oklch')
const distance = differenceEuclidean('oklab')

/**
 * Fold any hue angle into [0, 360).
 *
 * Every strategy computes hues by adding offsets — +180 for a complement, a
 * signed span for a thermal sweep, a negative spread for an analogous base —
 * so every one of them can land outside the circle. JavaScript's `%` keeps the
 * sign of the dividend, which makes the naive `h % 360` return a negative
 * angle; the double modulo is the fix, and it lives here once rather than
 * being retyped at each of the seven call sites that need it.
 */
export function normaliseHue(hue: number): number {
  return ((hue % 360) + 360) % 360
}

/** culori uses `undefined` for an achromatic hue; we always want a number. */
function normalise(color: { l?: number; c?: number; h?: number }): Oklch {
  return { l: color.l ?? 0, c: color.c ?? 0, h: color.h ?? 0 }
}

/**
 * Pull a colour into the sRGB gamut, preserving lightness and hue and giving up
 * chroma — culori's binary search over chroma, per CSS Color 4.
 *
 * Everything downstream of a strategy runs on gamut-mapped colours. Validating
 * raw OKLCH would bless palettes whose colours only look distinct in a space
 * the screen cannot show.
 */
export function toGamut(color: Oklch): Oklch {
  return normalise(toOklch(clampChroma({ mode: 'oklch', ...color }, 'oklch')))
}

/**
 * sRGB hex, gamut-mapped first.
 *
 * Uppercase, because that is the form the BasePaint dataset uses
 * (`#F7EE82,#F5872C,#55246B,#2A022A`) and the point of printing hex codes is
 * that they paste into a proposal unedited. The terminal, `--json` and the
 * contact sheet all go through here, so all three agree.
 */
export function toHex(color: Oklch): string {
  return formatHex({ mode: 'oklch', ...toGamut(color) }).toUpperCase()
}

/** Euclidean distance in OKLab — the perceptual "how different do these look". */
export function oklabDistance(a: Oklch, b: Oklch): number {
  return distance({ mode: 'oklch', ...a }, { mode: 'oklch', ...b })
}

/**
 * The smallest distance between any two colours in the palette. All pairs, not
 * only neighbours: two identical colours at opposite ends of the ramp are just
 * as unusable as two adjacent ones.
 */
export function minPairDistance(colors: Oklch[]): number {
  let min = Infinity
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      min = Math.min(min, oklabDistance(colors[i]!, colors[j]!))
    }
  }
  return min
}

/**
 * A `#rrggbb` string back to its three 8-bit channels.
 *
 * Lives in core rather than in the renderer: the terminal formatter needs it
 * for ANSI truecolour escapes, and making the CLI's text output depend on the
 * PNG layer for that would be backwards.
 */
export function hexToRgb(hex: string): Rgb {
  const body = hex.startsWith('#') ? hex.slice(1) : hex
  if (!/^[0-9a-fA-F]{6}$/.test(body)) {
    throw new Error(`expected a 6-digit hex colour, got "${hex}"`)
  }
  return [
    parseInt(body.slice(0, 2), 16),
    parseInt(body.slice(2, 4), 16),
    parseInt(body.slice(4, 6), 16),
  ]
}
