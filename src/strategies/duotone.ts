import { hueCycleRamp } from './ramp.js'
import type { Strategy } from './types.js'

/**
 * Two hues and nothing else — the two-colour palettes that genuinely appear in
 * BasePaint's history (21 of 1093 days).
 *
 * Capped at 4 colours. Past that the constraint stops being the point: a
 * six-colour two-hue palette is just a duller triad.
 */
export const duotone: Strategy = {
  id: 'duotone',
  description: 'Duotone: two hues, minimal ramp',
  colorRange: [2, 4],
  generate(rng, k) {
    const hueA = rng.range(0, 360)
    const hueB = hueA + rng.range(140, 220)
    return hueCycleRamp(rng, k, [hueA, hueB], [0.07, 0.14])
  },
}
