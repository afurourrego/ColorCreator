import { describe, expect, it } from 'vitest'
import {
  hexToRgb,
  minPairDistance,
  normaliseHue,
  oklabDistance,
  toGamut,
  toHex,
} from './oklch.js'

describe('toHex', () => {
  it('renders an in-gamut colour as a 6-digit hex string', () => {
    expect(toHex({ l: 0, c: 0, h: 0 })).toBe('#000000')
    expect(toHex({ l: 1, c: 0, h: 0 })).toBe('#FFFFFF')
  })

  it('always produces a well-formed hex string, even out of gamut', () => {
    // c = 0.4 at l = 0.1 is far outside sRGB for every hue.
    for (let h = 0; h < 360; h += 15) {
      expect(toHex({ l: 0.1, c: 0.4, h })).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('is uppercase, matching the BasePaint dataset format', () => {
    const hex = toHex({ l: 0.6, c: 0.15, h: 40 })
    expect(hex).toBe(hex.toUpperCase())
    expect(hex).not.toBe(hex.toLowerCase())
  })

  it('renders exactly the colour toGamut produces', () => {
    // The validator judges toGamut()'s output; the artist sees toHex()'s. If
    // these two ever clamped differently the tool would validate one colour and
    // print another.
    const raw = { l: 0.42, c: 0.37, h: 265 }
    expect(toHex(raw)).toBe(toHex(toGamut(raw)))
  })
})

describe('toGamut', () => {
  it('leaves an in-gamut colour essentially untouched', () => {
    const input = { l: 0.5, c: 0.05, h: 200 }
    const out = toGamut(input)
    expect(out.l).toBeCloseTo(input.l, 6)
    expect(out.c).toBeCloseTo(input.c, 6)
    expect(out.h).toBeCloseTo(input.h, 6)
  })

  it('reduces chroma but preserves lightness and hue when out of gamut', () => {
    const input = { l: 0.4, c: 0.4, h: 250 }
    const out = toGamut(input)
    expect(out.c).toBeLessThan(input.c)
    expect(out.l).toBeCloseTo(input.l, 2)
    expect(out.h).toBeCloseTo(input.h, 1)
  })

  it('is idempotent — mapping an already-mapped colour changes nothing', () => {
    const once = toGamut({ l: 0.4, c: 0.4, h: 250 })
    const twice = toGamut(once)
    expect(twice.c).toBeCloseTo(once.c, 6)
  })
})

describe('oklabDistance', () => {
  it('is zero for identical colours', () => {
    expect(oklabDistance({ l: 0.5, c: 0.1, h: 30 }, { l: 0.5, c: 0.1, h: 30 })).toBe(0)
  })

  it('separates black from white by roughly one unit of lightness', () => {
    const d = oklabDistance({ l: 0, c: 0, h: 0 }, { l: 1, c: 0, h: 0 })
    expect(d).toBeCloseTo(1, 2)
  })

  it('is symmetric', () => {
    const a = { l: 0.3, c: 0.12, h: 20 }
    const b = { l: 0.8, c: 0.04, h: 240 }
    expect(oklabDistance(a, b)).toBeCloseTo(oklabDistance(b, a), 12)
  })
})

describe('minPairDistance', () => {
  it('returns the smallest distance among all pairs, not just adjacent ones', () => {
    const colors = [
      { l: 0.1, c: 0, h: 0 },
      { l: 0.9, c: 0, h: 0 },
      { l: 0.12, c: 0, h: 0 }, // closest pair is index 0 and 2
    ]
    expect(minPairDistance(colors)).toBeCloseTo(0.02, 3)
  })

  it('returns Infinity for a single colour, which has no pairs', () => {
    expect(minPairDistance([{ l: 0.5, c: 0, h: 0 }])).toBe(Infinity)
  })
})

describe('normaliseHue', () => {
  it('leaves an in-range angle alone', () => {
    expect(normaliseHue(0)).toBe(0)
    expect(normaliseHue(359.5)).toBe(359.5)
  })

  it('wraps past a full turn back into range', () => {
    expect(normaliseHue(360)).toBe(0)
    expect(normaliseHue(370)).toBeCloseTo(10, 10)
    expect(normaliseHue(725)).toBeCloseTo(5, 10)
  })

  it('maps a negative angle to its positive equivalent, unlike a bare %', () => {
    // -30 % 360 is -30 in JavaScript: the trap this function exists to close.
    expect(normaliseHue(-30)).toBeCloseTo(330, 10)
    expect(normaliseHue(-390)).toBeCloseTo(330, 10)
  })
})

describe('hexToRgb', () => {
  it('parses with and without the hash', () => {
    expect(hexToRgb('#FF8800')).toEqual([255, 136, 0])
    expect(hexToRgb('00FF7F')).toEqual([0, 255, 127])
  })

  it('accepts either case, since only what toHex emits is uppercase', () => {
    expect(hexToRgb('#ff8800')).toEqual(hexToRgb('#FF8800'))
  })

  it('rejects anything that is not six hex digits', () => {
    expect(() => hexToRgb('#fff')).toThrow()
    expect(() => hexToRgb('#gggggg')).toThrow()
  })
})
