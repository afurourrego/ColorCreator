export type Rng = {
  /** Uniform in [0, 1). */
  next(): number
  /** Uniform in [min, max). */
  range(min: number, max: number): number
  /** Uniform integer in [min, max], both inclusive. */
  int(min: number, max: number): number
}

/** xmur3 string hash. Stable across runs and platforms. */
export function hashSeed(input: string): number {
  let h = 1779033703 ^ input.length
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

/** mulberry32 — small, fast, and good enough for choosing colours. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
  }
}

/**
 * The seed for one attempt by one strategy on one day.
 *
 * Keyed by strategy id rather than drawn from a shared counter, so that adding a
 * strategy later does not shift the PRNG stream and silently change what every
 * other strategy produces. "Same day, same palette" is the whole promise.
 */
export function seedFor(day: number, strategyId: string, attempt: number): number {
  return hashSeed(`${strategyId}:${day}:${attempt}`)
}
