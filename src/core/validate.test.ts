import { describe, expect, it } from 'vitest'
import type { Oklch } from './types.js'
import { isValid, score, separationThreshold, violations } from './validate.js'

/** A palette that passes every rule; individual tests break one thing at a time. */
function goodPalette(): Oklch[] {
  return [
    { l: 0.12, c: 0.06, h: 260 },
    { l: 0.34, c: 0.11, h: 250 },
    { l: 0.56, c: 0.13, h: 240 },
    { l: 0.75, c: 0.09, h: 230 },
    { l: 0.93, c: 0.04, h: 220 },
  ]
}

describe('separationThreshold', () => {
  it('is 0.40 / k', () => {
    expect(separationThreshold(2)).toBeCloseTo(0.2, 10)
    expect(separationThreshold(8)).toBeCloseTo(0.05, 10)
    expect(separationThreshold(16)).toBeCloseTo(0.025, 10)
  })
})

describe('violations', () => {
  it('returns nothing for a good palette', () => {
    expect(violations(goodPalette())).toEqual([])
  })

  it('flags a missing dark anchor', () => {
    const p = goodPalette()
    p[0] = { l: 0.45, c: 0.06, h: 260 }
    expect(violations(p)).toContain('dark-anchor')
  })

  it('flags a missing light anchor', () => {
    const p = goodPalette()
    p[4] = { l: 0.7, c: 0.04, h: 220 }
    expect(violations(p)).toContain('light-anchor')
  })

  it('flags an insufficient lightness span', () => {
    const p: Oklch[] = [
      { l: 0.2, c: 0.09, h: 30 },
      { l: 0.45, c: 0.09, h: 30 },
      { l: 0.7, c: 0.09, h: 30 },
    ]
    expect(violations(p)).toContain('l-span')
  })

  it('flags a washed-out palette', () => {
    const p = goodPalette().map((color) => ({ ...color, c: 0.005 }))
    expect(violations(p)).toContain('chroma-mean')
  })

  it('flags a radioactive palette', () => {
    const p = goodPalette().map((color) => ({ ...color, c: 0.3 }))
    expect(violations(p)).toContain('chroma-mean')
  })

  it('flags two colours too close to tell apart', () => {
    const p = goodPalette()
    p[2] = { ...p[1]!, l: p[1]!.l + 0.001 }
    expect(violations(p)).toContain('separation')
  })

  it('reports every broken rule, not just the first', () => {
    const flat: Oklch[] = [
      { l: 0.5, c: 0.005, h: 0 },
      { l: 0.52, c: 0.005, h: 0 },
    ]
    const found = violations(flat)
    expect(found).toContain('dark-anchor')
    expect(found).toContain('light-anchor')
    expect(found).toContain('l-span')
    expect(found).toContain('chroma-mean')
    expect(found).toContain('separation')
  })
})

describe('isValid', () => {
  it('agrees with violations()', () => {
    expect(isValid(goodPalette())).toBe(true)
    expect(isValid([{ l: 0.5, c: 0.09, h: 0 }, { l: 0.52, c: 0.09, h: 0 }])).toBe(false)
  })
})

describe('score', () => {
  it('returns an integer in [0, 100]', () => {
    const s = score(goodPalette())
    expect(Number.isInteger(s)).toBe(true)
    expect(s).toBeGreaterThanOrEqual(0)
    expect(s).toBeLessThanOrEqual(100)
  })

  it('prefers evenly spread lightness over a clumped ramp', () => {
    const even: Oklch[] = [
      { l: 0.1, c: 0.09, h: 200 },
      { l: 0.37, c: 0.09, h: 200 },
      { l: 0.64, c: 0.09, h: 200 },
      { l: 0.92, c: 0.09, h: 200 },
    ]
    const clumped: Oklch[] = [
      { l: 0.1, c: 0.09, h: 200 },
      { l: 0.16, c: 0.09, h: 200 },
      { l: 0.23, c: 0.09, h: 200 },
      { l: 0.92, c: 0.09, h: 200 },
    ]
    expect(score(even)).toBeGreaterThan(score(clumped))
  })

  it('prefers chroma near the historical median over a near-grey palette', () => {
    const vivid = goodPalette()
    const drab = goodPalette().map((color) => ({ ...color, c: 0.042 }))
    expect(score(vivid)).toBeGreaterThan(score(drab))
  })

  it('is deterministic', () => {
    expect(score(goodPalette())).toBe(score(goodPalette()))
  })
})
