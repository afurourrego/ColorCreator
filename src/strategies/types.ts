import type { Rng } from '../core/rng.js'
import type { Oklch } from '../core/types.js'

export type Strategy = {
  /** Stable kebab-case id. Part of the seed, so renaming one changes its output. */
  id: string
  /** One line, shown by the CLI when listing strategies. */
  description: string
  /** Inclusive [min, max] palette sizes this strategy can express. */
  colorRange: [number, number]
  /**
   * Produce k colours in OKLCH. May return out-of-gamut chroma; the caller
   * gamut-maps before validating.
   */
  generate(rng: Rng, k: number): Oklch[]
}
