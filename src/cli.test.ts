import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { run } from './cli.js'

let dir: string
let out: string[]
let err: string[]

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'colorcreator-'))
  out = []
  err = []
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    out.push(String(chunk))
    return true
  })
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    err.push(String(chunk))
    return true
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  rmSync(dir, { recursive: true, force: true })
})

describe('run', () => {
  it('prints candidates and exits 0', async () => {
    expect(await run(['1097'])).toBe(0)
    expect(out.join('')).toContain('smooth-ramp')
  })

  it('emits parseable JSON with --json', async () => {
    expect(await run(['1097', '--json'])).toBe(0)
    const parsed = JSON.parse(out.join(''))
    expect(parsed.day).toBe(1097)
    expect(Array.isArray(parsed.candidates)).toBe(true)
  })

  it('honours --count', async () => {
    await run(['1097', '--json', '--count', '3'])
    expect(JSON.parse(out.join('')).candidates).toHaveLength(3)
  })

  it('writes a PNG to the given path', async () => {
    const path = join(dir, 'sheet.png')
    expect(await run(['1097', '--png', path])).toBe(0)
    expect(existsSync(path)).toBe(true)
    expect(readFileSync(path).subarray(1, 4).toString('ascii')).toBe('PNG')
  })

  it('keeps --json stdout parseable when combined with --png', async () => {
    // The "wrote <path>" confirmation must go to stderr, not stdout — stdout is
    // the data channel when --json is set, and a stray line after the JSON
    // blob would break anything piping this output into a parser.
    const path = join(dir, 'sheet.png')
    expect(await run(['1097', '--json', '--png', path])).toBe(0)
    const parsed = JSON.parse(out.join(''))
    expect(parsed.day).toBe(1097)
    expect(existsSync(path)).toBe(true)
  })

  it('exits 1 on a bare --png with no value', async () => {
    expect(await run(['1097', '--png'])).toBe(1)
    expect(err.join('')).toContain('argument missing')
  })

  it('quotes the actual input when --colors is not a number', async () => {
    expect(await run(['1097', '--colors', 'banana'])).toBe(1)
    expect(err.join('')).toContain('"banana"')
    expect(err.join('')).toMatch(/between 2 and 16/)
  })

  it('exits 1 on a non-numeric day', async () => {
    expect(await run(['banana'])).toBe(1)
    expect(err.join('')).toMatch(/positive integer/)
  })

  it('exits 1 on a missing day', async () => {
    expect(await run([])).toBe(1)
  })

  it('exits 1 on colours outside 2-16', async () => {
    expect(await run(['1097', '--colors', '20'])).toBe(1)
    expect(err.join('')).toMatch(/between 2 and 16/)
  })

  it('exits 1 on an unknown strategy and lists the valid ones', async () => {
    expect(await run(['1097', '--strategy', 'rainbow'])).toBe(1)
    expect(err.join('')).toContain('smooth-ramp')
  })

  it('exits 1 when the PNG directory does not exist, without creating it', async () => {
    const path = join(dir, 'nope', 'sheet.png')
    expect(await run(['1097', '--png', path])).toBe(1)
    expect(err.join('')).toContain('nope')
    expect(existsSync(join(dir, 'nope'))).toBe(false)
  })

  it('exits 1 on an unknown flag', async () => {
    expect(await run(['1097', '--wat'])).toBe(1)
  })

  it('names the skipped strategy and its reason when nothing survives', async () => {
    // duotone's colorRange is [2, 4], so --colors 16 skips it as out-of-range.
    // Reporting "no strategy produced a valid palette" here would be false.
    expect(await run(['1097', '--strategy', 'duotone', '--colors', '16'])).toBe(1)
    expect(err.join('')).toContain('duotone')
    expect(err.join('')).toContain('out-of-range')
    expect(err.join('')).not.toContain('no strategy produced a valid palette')
  })

  it('reports the shortfall when --count asks for more than survived', async () => {
    expect(await run(['1097', '--count', '20'])).toBe(0)
    expect(out.join('')).toMatch(/short of the 20 requested/)
  })

  it('carries the requested count through --json', async () => {
    await run(['1097', '--json', '--count', '20'])
    expect(JSON.parse(out.join('')).requestedCount).toBe(20)
  })

  it('lists the strategies with --list', async () => {
    expect(await run(['--list'])).toBe(0)
    expect(out.join('')).toContain('inverse-contrast')
  })
})
