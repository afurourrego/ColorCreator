import {
  CHROMA_MEAN_MAX,
  CHROMA_MEAN_MIN,
  CHROMA_MEDIAN,
  DARK_ANCHOR_L_MAX,
  LIGHT_ANCHOR_L_MIN,
  L_SPAN_MIN,
  SEPARATION_NUMERATOR,
} from './constants.js'
import { minPairDistance, normaliseHue } from './oklch.js'
import type { Oklch } from './types.js'

/** Minimum acceptable OKLab distance between any two colours in a k-colour palette. */
export function separationThreshold(k: number): number {
  return SEPARATION_NUMERATOR / k
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Every hard rule the palette breaks, by id. Empty means the palette is usable.
 *
 * Returns all violations rather than short-circuiting on the first: when a
 * strategy fails repeatedly, the full list is what tells you whether it is one
 * bad rule or a strategy that is simply wrong.
 *
 * Expects gamut-mapped colours — see toGamut().
 */
export function violations(colors: Oklch[]): string[] {
  const found: string[] = []
  const lightness = colors.map((c) => c.l)
  const darkest = Math.min(...lightness)
  const lightest = Math.max(...lightness)

  if (darkest > DARK_ANCHOR_L_MAX) found.push('dark-anchor')
  if (lightest < LIGHT_ANCHOR_L_MIN) found.push('light-anchor')
  if (lightest - darkest < L_SPAN_MIN) found.push('l-span')

  const meanChroma = mean(colors.map((c) => c.c))
  if (meanChroma < CHROMA_MEAN_MIN || meanChroma > CHROMA_MEAN_MAX) {
    found.push('chroma-mean')
  }

  if (minPairDistance(colors) < separationThreshold(colors.length)) {
    found.push('separation')
  }

  return found
}

export function isValid(colors: Oklch[]): boolean {
  return violations(colors).length === 0
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/**
 * How comfortably the closest pair clears the separation threshold. Capped: a
 * palette twice as separated as required is already fine, and rewarding more
 * would just favour tiny palettes.
 */
function separationMargin(colors: Oklch[]): number {
  const ratio = minPairDistance(colors) / separationThreshold(colors.length)
  return clamp01((ratio - 1) / 1)
}

/**
 * How evenly the colours are spread across the lightness range. Penalises the
 * palette that has six shades of dark and one white — technically wide, useless
 * for shading the middle of a drawing.
 */
function lightnessEvenness(colors: Oklch[]): number {
  if (colors.length < 3) return 1
  const sorted = [...colors].map((c) => c.l).sort((a, b) => a - b)
  const gaps = sorted.slice(1).map((l, i) => l - sorted[i]!)
  const avg = mean(gaps)
  if (avg === 0) return 0
  const variance = mean(gaps.map((g) => (g - avg) ** 2))
  return clamp01(1 - Math.sqrt(variance) / avg)
}

/** Closeness of the palette's mean chroma to the historical median. */
function chromaVitality(colors: Oklch[]): number {
  const meanChroma = mean(colors.map((c) => c.c))
  return clamp01(1 - Math.abs(meanChroma - CHROMA_MEDIAN) / CHROMA_MEDIAN)
}

/**
 * How much of the hue circle the palette occupies, via the largest empty arc.
 * A single-hue ramp scores 0 here by design — it is a legitimate palette, just
 * a less varied one, and this is a tie-breaker rather than a gate.
 */
function hueSpread(colors: Oklch[]): number {
  const hues = [...new Set(colors.map((c) => normaliseHue(c.h)))].sort(
    (a, b) => a - b,
  )
  if (hues.length < 2) return 0
  let largestGap = 360 - hues[hues.length - 1]! + hues[0]!
  for (let i = 1; i < hues.length; i++) {
    largestGap = Math.max(largestGap, hues[i]! - hues[i - 1]!)
  }
  return clamp01(1 - largestGap / 360)
}

/**
 * 0-100, for ordering candidates only. Never rejects: everything reaching here
 * has already passed violations().
 */
export function score(colors: Oklch[]): number {
  const total =
    0.35 * separationMargin(colors) +
    0.3 * lightnessEvenness(colors) +
    0.2 * chromaVitality(colors) +
    0.15 * hueSpread(colors)
  return Math.round(total * 100)
}
