import { normaliseHue } from '../core/oklch.js'
import type { Oklch } from '../core/types.js'
import { lightnessRamp } from './ramp.js'
import type { Strategy } from './types.js'

/**
 * Two hues roughly 180 degrees apart, each owning one half of the lightness
 * range, meeting at a near-neutral midpoint.
 *
 * Chroma follows |2t - 1|: saturated at both extremes, grey where the hues
 * swap. Crossing through neutral is what stops it looking like two unrelated
 * palettes stapled together — the eye reads the grey as the hinge.
 */
export const oppositePoles: Strategy = {
  id: 'opposite-poles',
  description: 'Opposite poles: two facing hues meeting at a neutral midpoint',
  colorRange: [4, 16],
  generate(rng, k) {
    const hueA = rng.range(0, 360)
    const hueB = hueA + 180 + rng.range(-20, 20)
    const peakChroma = rng.range(0.13, 0.24)
    const lightness = lightnessRamp(rng, k)
    return lightness.map((l, i): Oklch => {
      const t = i / (k - 1)
      const hue = t < 0.5 ? hueA : hueB
      return {
        l,
        c: peakChroma * Math.abs(2 * t - 1) + 0.03,
        h: normaliseHue(hue),
      }
    })
  },
}
