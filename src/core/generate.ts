import { STRATEGIES, STRATEGY_IDS, findStrategy } from '../strategies/index.js'
import { sampleColorCount, sizesInRange } from '../strategies/sizing.js'
import type { Strategy } from '../strategies/types.js'
import { COLOR_COUNT_MAX, COLOR_COUNT_MIN, MAX_ATTEMPTS } from './constants.js'
import { toGamut, toHex } from './oklch.js'
import { makeRng, seedFor } from './rng.js'
import type { Candidate, Oklch } from './types.js'
import { isValid, score } from './validate.js'

export type GenerateOptions = {
  /** Keep only the best n candidates. Default: all of them. */
  count?: number
  /** Force every palette to this size. Default: each strategy samples its own. */
  colors?: number
  /** Restrict to a single strategy id. */
  strategy?: string
}

export type SkippedStrategy = {
  strategy: string
  reason: 'out-of-range' | 'no-valid-palette'
}

export type GenerateResult = {
  day: number
  candidates: Candidate[]
  /**
   * How many candidates the caller asked for — `options.count`, or the number
   * that survived when no count was given.
   *
   * Carried in the result so the shortfall is reportable. Without it a caller
   * reading `--json` sees eight candidates and no way to tell that twenty were
   * requested; a tool that goes quiet when it produces less than you asked for
   * makes you propose blind.
   */
  requestedCount: number
  /** Strategies that produced nothing, and why. Never silently dropped. */
  skipped: SkippedStrategy[]
}

function validateInputs(day: number, options: GenerateOptions): void {
  if (!Number.isInteger(day) || day < 1) {
    throw new Error(`day must be a positive integer, got ${day}`)
  }
  if (options.colors !== undefined) {
    const { colors } = options
    if (
      !Number.isInteger(colors) ||
      colors < COLOR_COUNT_MIN ||
      colors > COLOR_COUNT_MAX
    ) {
      throw new Error(
        `colors must be an integer between ${COLOR_COUNT_MIN} and ${COLOR_COUNT_MAX}, got ${colors}`,
      )
    }
  }
  if (options.count !== undefined && (!Number.isInteger(options.count) || options.count < 1)) {
    throw new Error(`count must be at least 1, got ${options.count}`)
  }
  if (options.strategy !== undefined && !findStrategy(options.strategy)) {
    throw new Error(
      `unknown strategy "${options.strategy}". Valid ids: ${STRATEGY_IDS.join(', ')}`,
    )
  }
}

/**
 * One strategy's best effort for one day, or null if it never produced a valid
 * palette.
 *
 * Retries with a fresh sub-seed rather than repairing the palette in place.
 * Repair would need to know what makes each strategy itself — nudging a duotone
 * apart to satisfy the separation rule turns it into a tritone — so the honest
 * move when a draw fails is to take another draw.
 */
function attempt(day: number, strategy: Strategy, fixedK: number | undefined): Candidate | null {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const rng = makeRng(seedFor(day, strategy.id, i))
    const k = fixedK ?? sampleColorCount(rng, strategy.colorRange)
    const colors: Oklch[] = strategy.generate(rng, k).map(toGamut)
    if (isValid(colors)) {
      return { strategy: strategy.id, colors: colors.map(toHex), score: score(colors) }
    }
  }
  return null
}

/** Palette candidates for a BasePaint day, best first. */
export function generate(day: number, options: GenerateOptions = {}): GenerateResult {
  validateInputs(day, options)

  const pool = options.strategy ? [findStrategy(options.strategy)!] : STRATEGIES
  const candidates: Candidate[] = []
  const skipped: SkippedStrategy[] = []

  for (const strategy of pool) {
    if (options.colors !== undefined && !sizesInRange(strategy.colorRange).includes(options.colors)) {
      skipped.push({ strategy: strategy.id, reason: 'out-of-range' })
      continue
    }
    const candidate = attempt(day, strategy, options.colors)
    if (candidate) candidates.push(candidate)
    else skipped.push({ strategy: strategy.id, reason: 'no-valid-palette' })
  }

  // Ties broken by strategy id so the order is stable, not insertion-dependent.
  // Compared by code point rather than localeCompare: strategy ids are ASCII,
  // but "same day, same palette" must not depend on the machine's locale.
  candidates.sort(
    (a, b) => b.score - a.score || (a.strategy < b.strategy ? -1 : a.strategy > b.strategy ? 1 : 0),
  )

  const requestedCount = options.count ?? candidates.length

  return {
    day,
    candidates: candidates.slice(0, requestedCount),
    requestedCount,
    skipped,
  }
}
