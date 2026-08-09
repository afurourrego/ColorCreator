import { normaliseHue } from '../core/oklch.js'
import type { Rng } from '../core/rng.js'
import type { Oklch } from '../core/types.js'

/**
 * An evenly spaced ascending lightness ramp of k values.
 *
 * The endpoints are drawn from bands that guarantee the dark anchor, the light
 * anchor and the span rule by construction. Strategies that build on this
 * cannot fail those three rules, which is why the generator needs no repair
 * step — only a retry.
 *
 * Deliberately linear rather than eased. OKLCH lightness is already
 * perceptually uniform, so linear steps look evenly spaced; an ease-in-out
 * would flatten to zero slope at both ends and push the first two and last two
 * colours close enough to trip the separation rule at k=16.
 */
export function lightnessRamp(rng: Rng, k: number): number[] {
  const lo = rng.range(0.08, 0.22)
  const hi = rng.range(0.88, 0.97)
  if (k === 1) return [lo]
  return Array.from({ length: k }, (_, i) => lo + ((hi - lo) * i) / (k - 1))
}

/**
 * k colours riding a lightness ramp, with hue cycling through `hues` and chroma
 * drawn inside `chromaRange`.
 *
 * Shared by every strategy whose identity is a hue *set* rather than a hue
 * *path* — triad, split-complement, and the base of analogous-accent. Those
 * differ only in which hues they pass in.
 */
export function hueCycleRamp(
  rng: Rng,
  k: number,
  hues: number[],
  chromaRange: [number, number],
): Oklch[] {
  const lightness = lightnessRamp(rng, k)
  return lightness.map((l, i) => ({
    l,
    c: rng.range(chromaRange[0], chromaRange[1]),
    h: normaliseHue(hues[i % hues.length]!),
  }))
}
