import { converter } from 'culori'
import { describe, expect, it } from 'vitest'
import { STRATEGIES, STRATEGY_IDS, findStrategy } from '../strategies/index.js'
import { sampleColorCount } from '../strategies/sizing.js'
import { generate } from './generate.js'
import { toGamut, toHex } from './oklch.js'
import { makeRng, seedFor } from './rng.js'
import type { Oklch } from './types.js'
import { isValid, violations } from './validate.js'

const cssToOklch = converter('oklch')

/**
 * Read an emitted hex back the way a consumer would — through culori, not
 * through anything in src/. The point of these checks is to judge the string
 * the artist actually receives, so parsing it with the generator's own
 * internals would defeat them.
 */
function parseHex(hex: string): Oklch {
  const parsed = cssToOklch(hex)
  if (!parsed) throw new Error(`culori could not parse "${hex}"`)
  return { l: parsed.l ?? 0, c: parsed.c ?? 0, h: parsed.h ?? 0 }
}

describe('generate', () => {
  it('is deterministic for a given day', () => {
    expect(generate(1097)).toEqual(generate(1097))
  })

  it('gives different palettes on different days', () => {
    expect(generate(1097).candidates[0]!.colors).not.toEqual(
      generate(1098).candidates[0]!.colors,
    )
  })

  it('returns candidates sorted by descending score', () => {
    const { candidates } = generate(1097)
    const scores = candidates.map((c) => c.score)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
  })

  it('returns well-formed hex colours, 2 to 16 of them', () => {
    for (const c of generate(1097).candidates) {
      expect(c.colors.length).toBeGreaterThanOrEqual(2)
      expect(c.colors.length).toBeLessThanOrEqual(16)
      for (const hex of c.colors) expect(hex).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('names a real strategy on every candidate', () => {
    for (const c of generate(1097).candidates) {
      expect(STRATEGY_IDS).toContain(c.strategy)
    }
  })

  it('produces at least six of the eight strategies on a typical day', () => {
    expect(generate(1097).candidates.length).toBeGreaterThanOrEqual(6)
  })

  it('honours count by truncating to the best n', () => {
    const all = generate(1097).candidates
    const three = generate(1097, { count: 3 }).candidates
    expect(three).toEqual(all.slice(0, 3))
  })

  it('carries the requested count so a shortfall is reportable', () => {
    // 20 candidates cannot exist: there are only eight strategies. Without
    // this field neither the terminal nor --json can say the request was
    // unmet.
    const result = generate(1097, { count: 20 })
    expect(result.requestedCount).toBe(20)
    expect(result.candidates.length).toBeLessThan(20)
  })

  it('reports the survivor count as the request when no count was asked for', () => {
    const result = generate(1097)
    expect(result.requestedCount).toBe(result.candidates.length)
  })

  it('honours strategy by returning only that one', () => {
    const { candidates } = generate(1097, { strategy: 'duotone' })
    expect(candidates.every((c) => c.strategy === 'duotone')).toBe(true)
  })

  it('honours colors by fixing the palette size', () => {
    for (const c of generate(1097, { colors: 8 }).candidates) {
      expect(c.colors).toHaveLength(8)
    }
  })

  it('skips strategies whose range excludes the requested size, and says so', () => {
    const { candidates, skipped } = generate(1097, { colors: 16 })
    expect(candidates.every((c) => c.strategy !== 'duotone')).toBe(true)
    expect(skipped).toContainEqual({ strategy: 'duotone', reason: 'out-of-range' })
  })

  it('rejects a day that is not a positive integer', () => {
    expect(() => generate(0)).toThrow(/positive integer/)
    expect(() => generate(-3)).toThrow(/positive integer/)
    expect(() => generate(1.5)).toThrow(/positive integer/)
    expect(() => generate(Number.NaN)).toThrow(/positive integer/)
  })

  it('rejects a colour count outside 2-16', () => {
    expect(() => generate(1097, { colors: 1 })).toThrow(/between 2 and 16/)
    expect(() => generate(1097, { colors: 17 })).toThrow(/between 2 and 16/)
  })

  it('rejects an unknown strategy and lists the valid ones', () => {
    expect(() => generate(1097, { strategy: 'rainbow' })).toThrow(/rainbow/)
    expect(() => generate(1097, { strategy: 'rainbow' })).toThrow(/smooth-ramp/)
  })

  it('rejects a non-positive count', () => {
    expect(() => generate(1097, { count: 0 })).toThrow(/at least 1/)
  })

  it('works across a wide sweep of days without throwing or going empty', () => {
    // Spec §11's property sweep. Asserting only "not empty" here would let a
    // strategy start returning palettes outside its own declared colorRange,
    // or malformed hex, on every day but 1097 — the only day the rest of this
    // file looks at.
    const failures: string[] = []
    for (let day = 1; day <= 2000; day += 7) {
      const { candidates } = generate(day)
      if (candidates.length === 0) failures.push(`day ${day}: no candidates`)
      for (const candidate of candidates) {
        const strategy = findStrategy(candidate.strategy)
        if (!strategy) {
          failures.push(`day ${day}: unknown strategy ${candidate.strategy}`)
          continue
        }
        const [min, max] = strategy.colorRange
        const k = candidate.colors.length
        if (k < min || k > max) {
          failures.push(`day ${day} ${candidate.strategy}: k=${k} outside [${min}, ${max}]`)
        }
        for (const hex of candidate.colors) {
          if (!/^#[0-9A-F]{6}$/.test(hex)) {
            failures.push(`day ${day} ${candidate.strategy}: malformed hex ${hex}`)
          }
        }
      }
    }
    expect(failures.slice(0, 10)).toEqual([])
  })

  it('emits hex that, read back, still clears all six hard rules', () => {
    // The seam between "validate the gamut-mapped colour" (floats) and "print
    // an 8-bit hex" (quantised). Spec §5 promises the validator judges the
    // colours the artist will actually see; rounding to 8 bits happens after
    // that judgement, and could in principle drag two colours back under the
    // separation threshold. It does not — this freezes that, so the promise
    // cannot quietly stop being true.
    const failures: string[] = []
    for (let day = 1; day <= 500; day++) {
      for (const candidate of generate(day).candidates) {
        const broken = violations(candidate.colors.map(parseHex))
        if (broken.length > 0) {
          failures.push(`day ${day} ${candidate.strategy}: ${broken.join(',')}`)
        }
      }
    }
    expect(failures.slice(0, 10)).toEqual([])
  })
})

describe('seed isolation', () => {
  it('seeds each strategy by id, so generate(1097) reproduces the independently-recomputed attempt-0 draw', () => {
    // Recomputes, from outside generate(), what attempt 0 should have produced for
    // each strategy — mirroring the exact draw order in generate.ts's attempt():
    // sampleColorCount() consumes from the rng before strategy.generate() does.
    // If seeding ever moved from strategy.id to catalogue position (or a shared
    // counter), this recomputation would diverge from generate(1097)'s actual
    // output and this test would catch it — unlike a bare seedFor() comparison,
    // which can't observe how the seed is actually used downstream.
    const { candidates } = generate(1097)
    let compared = 0
    for (const strategy of STRATEGIES) {
      const rng = makeRng(seedFor(1097, strategy.id, 0))
      const k = sampleColorCount(rng, strategy.colorRange)
      const expected = strategy.generate(rng, k).map(toGamut)
      if (!isValid(expected)) continue // generate() retried past attempt 0; nothing to compare here
      const actual = candidates.find((c) => c.strategy === strategy.id)
      expect(actual?.colors).toEqual(expected.map(toHex))
      compared++
    }
    // Guards against this test silently degrading into a no-op if every strategy
    // started failing attempt 0.
    expect(compared).toBeGreaterThanOrEqual(Math.ceil(STRATEGIES.length / 2))
  })

  it('gives each attempt its own stream', () => {
    const first = makeRng(seedFor(1097, 'triad', 0)).next()
    const second = makeRng(seedFor(1097, 'triad', 1)).next()
    expect(first).not.toBe(second)
  })
})
