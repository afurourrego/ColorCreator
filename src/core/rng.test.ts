import { describe, expect, it } from 'vitest'
import { hashSeed, makeRng, seedFor } from './rng.js'

describe('makeRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = makeRng(12345)
    const b = makeRng(12345)
    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('produces a different sequence for a different seed', () => {
    expect(makeRng(1).next()).not.toBe(makeRng(2).next())
  })

  it('stays in [0, 1)', () => {
    const rng = makeRng(99)
    for (let i = 0; i < 2000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('range() stays within bounds', () => {
    const rng = makeRng(7)
    for (let i = 0; i < 1000; i++) {
      const v = rng.range(-5, 12)
      expect(v).toBeGreaterThanOrEqual(-5)
      expect(v).toBeLessThan(12)
    }
  })

  it('int() is inclusive of both bounds and hits them', () => {
    const rng = makeRng(3)
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) seen.add(rng.int(1, 4))
    expect([...seen].sort()).toEqual([1, 2, 3, 4])
  })
})

describe('seedFor', () => {
  it('is deterministic', () => {
    expect(seedFor(1097, 'smooth-ramp', 0)).toBe(seedFor(1097, 'smooth-ramp', 0))
  })

  it('gives different seeds for different days, strategies and attempts', () => {
    const base = seedFor(1097, 'smooth-ramp', 0)
    expect(seedFor(1098, 'smooth-ramp', 0)).not.toBe(base)
    expect(seedFor(1097, 'opposite-poles', 0)).not.toBe(base)
    expect(seedFor(1097, 'smooth-ramp', 1)).not.toBe(base)
  })

  it('does not collide across a wide sweep of days and strategies', () => {
    const ids = ['smooth-ramp', 'opposite-poles', 'inverse-contrast', 'thermal']
    const seeds = new Set<number>()
    for (let day = 1; day <= 2000; day++) {
      for (const id of ids) seeds.add(seedFor(day, id, 0))
    }
    // A handful of collisions in 8000 draws from a 32-bit space is expected;
    // a systematic failure would show up as a much larger shortfall.
    expect(seeds.size).toBeGreaterThan(7990)
  })
})

describe('hashSeed', () => {
  it('is stable and unsigned', () => {
    const h = hashSeed('smooth-ramp:1097:0')
    expect(h).toBe(hashSeed('smooth-ramp:1097:0'))
    expect(h).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(h)).toBe(true)
  })
})
