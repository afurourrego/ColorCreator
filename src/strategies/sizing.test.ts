import { describe, expect, it } from 'vitest'
import { makeRng } from '../core/rng.js'
import { sampleColorCount, sizesInRange } from './sizing.js'

describe('sizesInRange', () => {
  it('lists the legal sizes inside the range, inclusive', () => {
    expect(sizesInRange([2, 4])).toEqual([2, 3, 4])
  })

  it('clips to the global 2-16 bounds', () => {
    expect(sizesInRange([0, 3])).toEqual([2, 3])
    expect(sizesInRange([15, 40])).toEqual([15, 16])
  })

  it('returns an empty list when the range is empty', () => {
    expect(sizesInRange([10, 4])).toEqual([])
  })
})

describe('sampleColorCount', () => {
  it('always returns a size inside the range', () => {
    const rng = makeRng(42)
    for (let i = 0; i < 500; i++) {
      const k = sampleColorCount(rng, [4, 10])
      expect(k).toBeGreaterThanOrEqual(4)
      expect(k).toBeLessThanOrEqual(10)
    }
  })

  it('follows the historical weights: 5 beats 9 over many draws', () => {
    const rng = makeRng(1)
    let fives = 0
    let nines = 0
    for (let i = 0; i < 5000; i++) {
      const k = sampleColorCount(rng, [2, 16])
      if (k === 5) fives++
      if (k === 9) nines++
    }
    expect(fives).toBeGreaterThan(nines * 2)
  })

  it('returns the only option when the range holds one size', () => {
    expect(sampleColorCount(makeRng(5), [7, 7])).toBe(7)
  })
})
