import { describe, expect, it } from 'vitest'
import type { Candidate } from './types.js'
import { generate } from './generate.js'

/**
 * The recorded output of day 1097 — spec §11's golden test.
 *
 * Every other determinism test in this suite is self-consistency inside one
 * process: `generate(1097) === generate(1097)`, or a seed-isolation check that
 * recomputes its own expectation with the same code under test. All of them
 * keep passing if a strategy's chroma band or lightnessRamp's endpoint bands
 * are retuned, while day 1097 quietly starts returning different colours.
 * "Same day, same palette" is the product's headline promise, and this literal
 * is the only thing standing between it and a silent regression.
 *
 * Recorded at 11bb989 (modulo hex case, which was lowercase until this branch
 * made all three output channels match the dataset's uppercase form).
 *
 * If this test fails, that is the question to answer before touching it: did
 * you mean to change what day 1097 produces? Updating the literal is correct
 * only when the answer is yes.
 */
const DAY_1097: Candidate[] = [
  {
    strategy: 'split-complement',
    score: 94,
    colors: ['#1B1300', '#004560', '#7C609A', '#C39E32', '#B1E3FF'],
  },
  {
    strategy: 'triad',
    score: 94,
    colors: ['#070600', '#002D3D', '#812D5D', '#838239', '#4FBCE8', '#FFD2E7'],
  },
  {
    strategy: 'duotone',
    score: 90,
    colors: ['#0B0004', '#1E4F31', '#CE749A', '#CDFFDC'],
  },
  {
    strategy: 'inverse-contrast',
    score: 90,
    colors: ['#270001', '#700150', '#8161A9', '#94ADDC', '#D3F0FB'],
  },
  {
    strategy: 'thermal',
    score: 89,
    colors: ['#000301', '#1C3700', '#726C00', '#DD9D00', '#FFEEE3'],
  },
  {
    strategy: 'opposite-poles',
    score: 87,
    colors: ['#001D1C', '#003E3C', '#0E625E', '#877078', '#C1899D', '#FDA1C4', '#FFDEE9'],
  },
  {
    strategy: 'smooth-ramp',
    score: 81,
    colors: ['#191018', '#65206B', '#A94ABA', '#D997EE', '#F9F0FD'],
  },
  {
    strategy: 'analogous-accent',
    score: 74,
    colors: ['#030200', '#456A39', '#A82F9E', '#ADE7DD'],
  },
]

describe('golden: day 1097', () => {
  it('returns exactly the recorded palettes, in the recorded order', () => {
    expect(generate(1097).candidates).toEqual(DAY_1097)
  })

  it('still covers all eight strategies', () => {
    // Not redundant with the literal: this is the assertion that fails loudly
    // and legibly when a strategy stops producing anything for 1097, instead
    // of drowning in a diff of eight palettes.
    expect(generate(1097).candidates).toHaveLength(8)
  })
})
