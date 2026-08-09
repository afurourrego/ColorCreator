import { hueCycleRamp } from './ramp.js'
import type { Strategy } from './types.js'

/**
 * A base hue plus the two neighbours of its complement. Keeps the tension of a
 * complementary pairing while dodging the vibration you get from pitting a hue
 * against its exact opposite.
 */
export const splitComplement: Strategy = {
  id: 'split-complement',
  description: 'Split complement: a base hue and the two neighbours of its opposite',
  colorRange: [4, 12],
  generate(rng, k) {
    const baseHue = rng.range(0, 360)
    const split = rng.range(25, 40)
    return hueCycleRamp(
      rng,
      k,
      [baseHue, baseHue + 180 - split, baseHue + 180 + split],
      [0.07, 0.15],
    )
  },
}
