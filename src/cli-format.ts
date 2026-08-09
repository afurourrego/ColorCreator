import type { GenerateResult } from './core/generate.js'
import { hexToRgb } from './core/oklch.js'

const RESET = '\x1b[0m'

function swatches(colors: string[]): string {
  return colors
    .map((hex) => {
      const [r, g, b] = hexToRgb(hex)
      return `\x1b[48;2;${r};${g};${b}m   ${RESET}`
    })
    .join('')
}

/**
 * The count line, which says how far short of the request the day came.
 *
 * Staying silent about a shortfall is the failure spec §10 calls out: you ask
 * for twenty, get eight, and have no way to know the other twelve were ever
 * possible.
 */
function headline(result: GenerateResult): string {
  const found = result.candidates.length
  const short = result.requestedCount - found
  const shortfall = short > 0 ? `, ${short} short of the ${result.requestedCount} requested` : ''
  return `BasePaint day ${result.day} — ${found} candidate(s)${shortfall}`
}

/** The human-facing terminal report. */
export function formatTerminal(result: GenerateResult): string {
  const lines: string[] = [headline(result), '']
  for (const candidate of result.candidates) {
    lines.push(`${candidate.strategy}  (${candidate.score})`)
    lines.push(swatches(candidate.colors))
    lines.push(candidate.colors.join(','))
    lines.push('')
  }
  if (result.skipped.length > 0) {
    lines.push(
      `skipped: ${result.skipped.map((s) => `${s.strategy} (${s.reason})`).join(', ')}`,
    )
  }
  return lines.join('\n')
}
