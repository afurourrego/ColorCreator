import { describe, expect, it } from 'vitest'
import { makeRng } from '../core/rng.js'
import { hueCycleRamp, lightnessRamp } from './ramp.js'

describe('lightnessRamp', () => {
  it('returns k values, ascending', () => {
    const ramp = lightnessRamp(makeRng(1), 6)
    expect(ramp).toHaveLength(6)
    for (let i = 1; i < ramp.length; i++) {
      expect(ramp[i]!).toBeGreaterThan(ramp[i - 1]!)
    }
  })

  it('always anchors dark and light, for every k and seed', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (let k = 2; k <= 16; k++) {
        const ramp = lightnessRamp(makeRng(seed), k)
        expect(ramp[0]!).toBeLessThanOrEqual(0.3)
        expect(ramp[ramp.length - 1]!).toBeGreaterThanOrEqual(0.85)
        expect(ramp[ramp.length - 1]! - ramp[0]!).toBeGreaterThanOrEqual(0.55)
      }
    }
  })

  it('is evenly spaced', () => {
    const ramp = lightnessRamp(makeRng(3), 5)
    const gaps = ramp.slice(1).map((l, i) => l - ramp[i]!)
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0]!, 10)
  })
})

describe('hueCycleRamp', () => {
  it('cycles through the given hues in order', () => {
    const colors = hueCycleRamp(makeRng(1), 6, [10, 130, 250], [0.08, 0.12])
    expect(colors.map((c) => c.h)).toEqual([10, 130, 250, 10, 130, 250])
  })

  it('rides the lightness ramp, so it anchors dark and light', () => {
    const colors = hueCycleRamp(makeRng(9), 7, [40, 220], [0.08, 0.12])
    const ls = colors.map((c) => c.l)
    expect(Math.min(...ls)).toBeLessThanOrEqual(0.3)
    expect(Math.max(...ls)).toBeGreaterThanOrEqual(0.85)
  })

  it('keeps chroma inside the requested band', () => {
    const colors = hueCycleRamp(makeRng(2), 10, [0, 120, 240], [0.07, 0.14])
    for (const c of colors) {
      expect(c.c).toBeGreaterThanOrEqual(0.07)
      expect(c.c).toBeLessThanOrEqual(0.14)
    }
  })

  it('normalises hues outside [0, 360)', () => {
    const colors = hueCycleRamp(makeRng(1), 2, [370, -30], [0.08, 0.12])
    expect(colors.map((c) => c.h)).toEqual([10, 330])
  })
})
