import { describe, expect, it } from 'vitest'
import {
  COLOR_COUNT_MAX,
  COLOR_COUNT_MIN,
  COLOR_COUNT_WEIGHTS,
} from './constants.js'

describe('COLOR_COUNT_WEIGHTS', () => {
  it('covers every legal palette size and nothing else', () => {
    const keys = Object.keys(COLOR_COUNT_WEIGHTS).map(Number).sort((a, b) => a - b)
    const expected = Array.from(
      { length: COLOR_COUNT_MAX - COLOR_COUNT_MIN + 1 },
      (_, i) => COLOR_COUNT_MIN + i,
    )
    expect(keys).toEqual(expected)
  })

  it('has a positive weight for every size', () => {
    for (const w of Object.values(COLOR_COUNT_WEIGHTS)) expect(w).toBeGreaterThan(0)
  })

  it('peaks at 5 across all history, with 8 close behind', () => {
    const max = Math.max(...Object.values(COLOR_COUNT_WEIGHTS))
    expect(COLOR_COUNT_WEIGHTS[5]).toBe(max)
    expect(COLOR_COUNT_WEIGHTS[8]).toBeGreaterThan(COLOR_COUNT_WEIGHTS[12]!)
  })
})
