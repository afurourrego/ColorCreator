import { describe, expect, it } from 'vitest'
import { formatTerminal } from './cli-format.js'
import type { GenerateResult } from './core/generate.js'

const RESULT: GenerateResult = {
  day: 1097,
  candidates: [
    { strategy: 'smooth-ramp', colors: ['#12060F', '#F8E3C2'], score: 92 },
    { strategy: 'duotone', colors: ['#0B1A2E', '#FFF2D4'], score: 71 },
  ],
  requestedCount: 2,
  skipped: [{ strategy: 'triad', reason: 'out-of-range' }],
}

describe('formatTerminal', () => {
  it('prints the day and each strategy with its score', () => {
    const out = formatTerminal(RESULT)
    expect(out).toContain('1097')
    expect(out).toContain('smooth-ramp')
    expect(out).toContain('92')
  })

  it('prints the palette in the BasePaint comma-joined format', () => {
    expect(formatTerminal(RESULT)).toContain('#12060F,#F8E3C2')
  })

  it('emits a truecolour escape for every colour', () => {
    // #12060F is rgb(18, 6, 15)
    expect(formatTerminal(RESULT)).toContain('\x1b[48;2;18;6;15m')
  })

  it('reports skipped strategies instead of hiding them', () => {
    const out = formatTerminal(RESULT)
    expect(out).toContain('triad')
    expect(out).toContain('out-of-range')
  })

  it('says so plainly when nothing was skipped', () => {
    const out = formatTerminal({ ...RESULT, skipped: [] })
    expect(out).not.toContain('skipped')
  })

  it('reports the shortfall when fewer candidates survived than were requested', () => {
    const out = formatTerminal({ ...RESULT, requestedCount: 20 })
    expect(out).toContain('2 candidate(s)')
    expect(out).toContain('18 short of the 20 requested')
  })

  it('stays quiet about the count when the request was met', () => {
    expect(formatTerminal(RESULT)).not.toContain('short of')
  })
})
