import { describe, expect, it } from 'vitest'
import {
  STRATEGIES,
  STRATEGY_IDS,
  findStrategy,
  generate,
  makeRng,
  seedFor,
} from './index.js'
import type { Candidate, GenerateResult, Oklch, Rng, Strategy } from './index.js'

describe('the public entry point', () => {
  it('generates a day', () => {
    const result: GenerateResult = generate(1097, { count: 2 })
    expect(result.day).toBe(1097)
    expect(result.candidates).toHaveLength(2)
    const first: Candidate = result.candidates[0]!
    expect(first.colors[0]).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('lets a consumer drive a strategy directly, using only exported names', () => {
    // This is the reason Rng/makeRng/seedFor are exported at all. Before, the
    // catalogue was readable but not callable: strategy.generate() takes an
    // Rng and there was no exported way to make one.
    const strategy: Strategy = findStrategy('smooth-ramp')!
    const rng: Rng = makeRng(seedFor(1097, strategy.id, 0))
    const colors: Oklch[] = strategy.generate(rng, strategy.colorRange[0])
    expect(colors).toHaveLength(strategy.colorRange[0])
    for (const c of colors) {
      expect(Number.isFinite(c.l)).toBe(true)
      expect(c.h).toBeGreaterThanOrEqual(0)
      expect(c.h).toBeLessThan(360)
    }
  })

  it('exposes the whole catalogue, not a subset', () => {
    expect(STRATEGY_IDS).toHaveLength(STRATEGIES.length)
    expect(STRATEGY_IDS).toContain('inverse-contrast')
  })

  it('keeps the renderer out of the library surface', async () => {
    // Spec §8 frames the PNG as a CLI feature; exporting the encoder here
    // would turn an implementation detail into a compatibility promise.
    const surface = await import('./index.js')
    expect(Object.keys(surface).sort()).toEqual([
      'STRATEGIES',
      'STRATEGY_IDS',
      'findStrategy',
      'generate',
      'makeRng',
      'seedFor',
    ])
  })
})
