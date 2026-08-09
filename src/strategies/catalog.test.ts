import { describe, expect, it } from 'vitest'
import { toGamut } from '../core/oklch.js'
import { makeRng, seedFor } from '../core/rng.js'
import { isValid, violations } from '../core/validate.js'
import { STRATEGIES, STRATEGY_IDS, findStrategy } from './index.js'
import { sizesInRange } from './sizing.js'

describe('the catalogue', () => {
  it('holds the eight strategies named in the spec', () => {
    expect(STRATEGY_IDS).toEqual([
      'smooth-ramp',
      'opposite-poles',
      'inverse-contrast',
      'thermal',
      'analogous-accent',
      'triad',
      'split-complement',
      'duotone',
    ])
  })

  it('has unique ids and a non-empty description each', () => {
    expect(new Set(STRATEGY_IDS).size).toBe(STRATEGIES.length)
    for (const s of STRATEGIES) expect(s.description.length).toBeGreaterThan(0)
  })

  it('declares colour ranges inside 2-16', () => {
    for (const s of STRATEGIES) {
      expect(s.colorRange[0]).toBeGreaterThanOrEqual(2)
      expect(s.colorRange[1]).toBeLessThanOrEqual(16)
      expect(s.colorRange[0]).toBeLessThanOrEqual(s.colorRange[1])
    }
  })

  it('finds by id and returns undefined for an unknown one', () => {
    expect(findStrategy('duotone')?.id).toBe('duotone')
    expect(findStrategy('nope')).toBeUndefined()
  })
})

describe.each(STRATEGIES)('strategy $id', (strategy) => {
  it('returns exactly k colours for every k in its range', () => {
    for (const k of sizesInRange(strategy.colorRange)) {
      const colors = strategy.generate(makeRng(seedFor(1097, strategy.id, 0)), k)
      expect(colors).toHaveLength(k)
    }
  })

  it('returns finite, in-range OKLCH values', () => {
    for (const k of sizesInRange(strategy.colorRange)) {
      for (const c of strategy.generate(makeRng(seedFor(7, strategy.id, 0)), k)) {
        expect(Number.isFinite(c.l)).toBe(true)
        expect(c.l).toBeGreaterThanOrEqual(0)
        expect(c.l).toBeLessThanOrEqual(1)
        expect(c.c).toBeGreaterThanOrEqual(0)
        expect(c.c).toBeLessThanOrEqual(0.4)
        expect(c.h).toBeGreaterThanOrEqual(0)
        expect(c.h).toBeLessThan(360)
      }
    }
  })

  it('is deterministic for a given seed and k', () => {
    const k = sizesInRange(strategy.colorRange)[0]!
    const a = strategy.generate(makeRng(1234), k)
    const b = strategy.generate(makeRng(1234), k)
    expect(a).toEqual(b)
  })

  it('produces a valid palette on the first attempt at least 70% of the time', () => {
    // The retry budget is 8. A strategy that needs more than a couple of tries
    // is misdesigned, not unlucky — this test is what catches that.
    const sizes = sizesInRange(strategy.colorRange)
    let attempts = 0
    let passes = 0
    const failures: string[] = []
    for (let day = 1; day <= 120; day++) {
      for (const k of sizes) {
        const colors = strategy
          .generate(makeRng(seedFor(day, strategy.id, 0)), k)
          .map(toGamut)
        attempts++
        if (isValid(colors)) passes++
        else failures.push(`day ${day} k=${k}: ${violations(colors).join(',')}`)
      }
    }
    expect(passes / attempts, failures.slice(0, 10).join('\n')).toBeGreaterThan(0.7)
  })
})
