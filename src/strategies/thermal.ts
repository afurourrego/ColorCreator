import { normaliseHue } from '../core/oklch.js'
import type { Oklch } from '../core/types.js'
import { lightnessRamp } from './ramp.js'
import type { Strategy } from './types.js'

/**
 * Hue rotates monotonically with lightness, the way a heat map runs from black
 * through purple and red to yellow and white.
 *
 * Chroma follows a parabola peaking in the middle, for the same gamut reason as
 * smooth-ramp: full saturation is unreachable near either end anyway.
 */
export const thermal: Strategy = {
  id: 'thermal',
  description: 'Thermal ramp: hue rotates steadily as lightness rises',
  colorRange: [5, 16],
  generate(rng, k) {
    const startHue = rng.range(0, 360)
    const hueSpan = rng.range(100, 200) * (rng.next() < 0.5 ? 1 : -1)
    const peakChroma = rng.range(0.12, 0.21)
    const lightness = lightnessRamp(rng, k)
    return lightness.map((l, i): Oklch => {
      const t = i / (k - 1)
      return {
        l,
        c: peakChroma * (1 - (2 * t - 1) ** 2) + 0.025,
        h: normaliseHue(startHue + hueSpan * t),
      }
    })
  },
}
