import { normaliseHue } from '../core/oklch.js'
import type { Oklch } from '../core/types.js'
import { lightnessRamp } from './ramp.js'
import type { Strategy } from './types.js'

/**
 * The chroma and temperature ramps run against the lightness ramp: the darks
 * are warm and saturated, the lights cool and washed out (or the reverse, by
 * coin flip).
 *
 * Inverts the usual instinct, where saturation tracks brightness. The result
 * reads as heavy, smoky shadows under a pale sky, and it gives an artist a very
 * different set of shading moves from a conventional ramp.
 */
export const inverseContrast: Strategy = {
  id: 'inverse-contrast',
  description: 'Inverse contrast: saturated warm darks, washed-out cool lights',
  colorRange: [4, 12],
  generate(rng, k) {
    const flipped = rng.next() < 0.5
    const warmHue = rng.range(15, 65)
    const coolHue = rng.range(200, 265)
    const startHue = flipped ? coolHue : warmHue
    const endHue = flipped ? warmHue : coolHue
    // Take the shorter way round the hue circle, so the ramp never doubles back.
    const delta = ((endHue - startHue + 540) % 360) - 180
    const highChroma = rng.range(0.16, 0.23)
    const lowChroma = rng.range(0.02, 0.05)
    const lightness = lightnessRamp(rng, k)
    return lightness.map((l, i): Oklch => {
      const t = i / (k - 1)
      return {
        l,
        c: highChroma + (lowChroma - highChroma) * t,
        h: normaliseHue(startHue + delta * t),
      }
    })
  },
}
