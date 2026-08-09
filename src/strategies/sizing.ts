import {
  COLOR_COUNT_MAX,
  COLOR_COUNT_MIN,
  COLOR_COUNT_WEIGHTS,
} from '../core/constants.js'
import type { Rng } from '../core/rng.js'

/** Legal palette sizes inside `range`, clipped to the global 2-16 bounds. */
export function sizesInRange(range: [number, number]): number[] {
  const lo = Math.max(COLOR_COUNT_MIN, range[0])
  const hi = Math.min(COLOR_COUNT_MAX, range[1])
  const sizes: number[] = []
  for (let k = lo; k <= hi; k++) sizes.push(k)
  return sizes
}

/**
 * Draw a palette size from the historical distribution, restricted to the sizes
 * this strategy can express. Generated palettes then have the same size profile
 * BasePaint already uses instead of a flat 2-16 spread.
 *
 * Throws if the range is empty — callers must check with sizesInRange() first.
 */
export function sampleColorCount(rng: Rng, range: [number, number]): number {
  const sizes = sizesInRange(range)
  if (sizes.length === 0) {
    throw new Error(`no legal palette size in range [${range[0]}, ${range[1]}]`)
  }
  const total = sizes.reduce((sum, k) => sum + COLOR_COUNT_WEIGHTS[k]!, 0)
  let ticket = rng.next() * total
  for (const k of sizes) {
    ticket -= COLOR_COUNT_WEIGHTS[k]!
    if (ticket <= 0) return k
  }
  // Defensive fallback for floating-point rounding edge cases
  return sizes[sizes.length - 1]!
}
