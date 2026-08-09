import { normaliseHue } from '../core/oklch.js'
import type { Oklch } from '../core/types.js'
import { lightnessRamp } from './ramp.js'
import type { Strategy } from './types.js'

/**
 * A single hue with a slight drift, lightness spread evenly, and chroma bowed
 * into an arc — near-neutral at both ends, most saturated in the middle.
 *
 * The arc is what makes it read as a smooth gradient rather than a tinted grey
 * scale: real ramps lose saturation as they approach black and white, because
 * the gamut narrows there anyway.
 */
export const smoothRamp: Strategy = {
  id: 'smooth-ramp',
  description: 'Smooth gradient: one hue, even lightness, chroma arc',
  colorRange: [5, 16],
  generate(rng, k) {
    const baseHue = rng.range(0, 360)
    const drift = rng.range(-25, 25)
    const peakChroma = rng.range(0.11, 0.2)
    const lightness = lightnessRamp(rng, k)
    return lightness.map((l, i): Oklch => {
      const t = k === 1 ? 0 : i / (k - 1)
      return {
        l,
        c: peakChroma * Math.sin(Math.PI * t) + 0.02,
        h: normaliseHue(baseHue + drift * t),
      }
    })
  },
}
