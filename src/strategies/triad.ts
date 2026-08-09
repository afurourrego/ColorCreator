import { hueCycleRamp } from './ramp.js'
import type { Strategy } from './types.js'

/**
 * Three hues 120 degrees apart, cycling along the lightness ramp. The classic
 * balanced harmony: no hue dominates, and every colour has two contrasting
 * partners.
 */
export const triad: Strategy = {
  id: 'triad',
  description: 'Triad: three hues 120 degrees apart along a lightness ramp',
  colorRange: [6, 12],
  generate(rng, k) {
    const baseHue = rng.range(0, 360)
    return hueCycleRamp(
      rng,
      k,
      [baseHue, baseHue + 120, baseHue + 240],
      [0.07, 0.15],
    )
  },
}
