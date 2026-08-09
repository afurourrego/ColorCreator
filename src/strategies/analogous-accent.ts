import { normaliseHue } from '../core/oklch.js'
import type { Oklch } from '../core/types.js'
import { hueCycleRamp } from './ramp.js'
import type { Strategy } from './types.js'

/**
 * Three neighbouring hues carrying the ramp, plus one or two high-chroma
 * accents from the far side of the wheel, dropped in at mid lightness.
 *
 * The analogous base is calm enough to build a whole drawing on; the accents
 * are the one or two colours an artist uses sparingly and deliberately. Placing
 * them at mid lightness is what keeps them usable — an accent at the extremes
 * would compete with the anchors.
 */
export const analogousAccent: Strategy = {
  id: 'analogous-accent',
  description: 'Analogous base of three neighbouring hues plus opposing accents',
  colorRange: [4, 10],
  generate(rng, k) {
    const baseHue = rng.range(0, 360)
    const spread = rng.range(25, 45)
    const accentCount = k >= 7 ? 2 : 1
    const baseCount = k - accentCount
    const base = hueCycleRamp(
      rng,
      baseCount,
      [baseHue - spread, baseHue, baseHue + spread],
      [0.06, 0.12],
    )
    const accents: Oklch[] = Array.from({ length: accentCount }, (_, i) => ({
      l: 0.45 + 0.16 * (accentCount === 1 ? 0.5 : i),
      c: rng.range(0.18, 0.26),
      h: normaliseHue(baseHue + 180 + rng.range(-25, 25)),
    }))
    // Keep the whole palette in lightness order: BasePaint palettes read as ramps.
    return [...base, ...accents].sort((a, b) => a.l - b.l)
  },
}
