import { analogousAccent } from './analogous-accent.js'
import { duotone } from './duotone.js'
import { inverseContrast } from './inverse-contrast.js'
import { oppositePoles } from './opposite-poles.js'
import { smoothRamp } from './smooth-ramp.js'
import { splitComplement } from './split-complement.js'
import { thermal } from './thermal.js'
import { triad } from './triad.js'
import type { Strategy } from './types.js'

/**
 * The catalogue, in display order. The three the spec names explicitly come
 * first; the rest exist so that eight candidates for one day do not all look
 * like each other.
 */
export const STRATEGIES: Strategy[] = [
  smoothRamp,
  oppositePoles,
  inverseContrast,
  thermal,
  analogousAccent,
  triad,
  splitComplement,
  duotone,
]

export const STRATEGY_IDS: string[] = STRATEGIES.map((s) => s.id)

export function findStrategy(id: string): Strategy | undefined {
  return STRATEGIES.find((s) => s.id === id)
}

export type { Strategy } from './types.js'
