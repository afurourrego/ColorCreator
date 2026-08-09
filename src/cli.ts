#!/usr/bin/env node
/*
 * ColorCreator — deterministic BasePaint palette generator, seeded by day number.
 * Copyright (C) 2026  Cristhian Urrego
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version. See LICENSE for the full text.
 */

import { existsSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { formatTerminal } from './cli-format.js'
import { COLOR_COUNT_MAX, COLOR_COUNT_MIN } from './core/constants.js'
import { generate } from './core/generate.js'
import { STRATEGIES } from './strategies/index.js'
import { encodePng } from './render/png.js'
import { renderContactSheet } from './render/sheet.js'

const USAGE = `colorcreator <day> [options]

  --count <n>        keep only the best n candidates
  --colors <k>       force every palette to k colours (2-16)
  --strategy <id>    restrict to one strategy
  --json             machine-readable output
  --png <path>       write a contact sheet to <path>
  --list             list the strategies and exit
  --help             show this message
`

function fail(message: string): number {
  process.stderr.write(`${message}\n`)
  return 1
}

/**
 * Number(raw) on a non-numeric string produces NaN, and generate()'s own
 * validation would then report "got NaN" — true of the coerced value, useless
 * to a user who typed "--count banana" and has no idea what NaN refers to.
 * Catching the conversion here, before generate() ever sees it, lets the
 * error quote what was actually typed.
 */
function parseCount(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  const n = Number(raw)
  if (Number.isNaN(n)) throw new Error(`count must be at least 1, got "${raw}"`)
  return n
}

function parseColors(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  const n = Number(raw)
  if (Number.isNaN(n)) {
    throw new Error(
      `colors must be an integer between ${COLOR_COUNT_MIN} and ${COLOR_COUNT_MAX}, got "${raw}"`,
    )
  }
  return n
}

/** Returns the process exit code. Separated from process.exit so it is testable. */
export async function run(argv: string[]): Promise<number> {
  let parsed
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        count: { type: 'string' },
        colors: { type: 'string' },
        strategy: { type: 'string' },
        json: { type: 'boolean' },
        png: { type: 'string' },
        list: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    })
  } catch (error) {
    return fail(`${(error as Error).message}\n\n${USAGE}`)
  }

  const { values, positionals } = parsed

  if (values.help) {
    process.stdout.write(USAGE)
    return 0
  }

  if (values.list) {
    for (const s of STRATEGIES) {
      process.stdout.write(`${s.id.padEnd(20)} ${s.description} (${s.colorRange[0]}-${s.colorRange[1]})\n`)
    }
    return 0
  }

  if (positionals.length === 0) return fail(`missing day\n\n${USAGE}`)

  const day = Number(positionals[0])
  if (!Number.isInteger(day) || day < 1) {
    return fail(`day must be a positive integer, got "${positionals[0]}"`)
  }

  let result
  try {
    result = generate(day, {
      count: parseCount(values.count),
      colors: parseColors(values.colors),
      strategy: values.strategy,
    })
  } catch (error) {
    return fail((error as Error).message)
  }

  if (result.candidates.length === 0) {
    // result.skipped holds the actual reason each strategy dropped out —
    // "out-of-range" is a different problem from "no-valid-palette", and
    // reporting the second when the first happened sends the user hunting for
    // a bug that is not there.
    const why =
      result.skipped.length > 0
        ? result.skipped.map((s) => `${s.strategy} (${s.reason})`).join(', ')
        : 'no strategy produced a valid palette'
    return fail(`no candidates for day ${day} — ${why}`)
  }

  if (values.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  } else {
    process.stdout.write(`${formatTerminal(result)}\n`)
  }

  if (values.png !== undefined) {
    const path = resolve(values.png)
    // Deliberately not mkdir -p: writing directory trees nobody asked for is how
    // folders get littered.
    if (!existsSync(dirname(path))) {
      return fail(`directory does not exist: ${dirname(path)}`)
    }
    try {
      writeFileSync(path, encodePng(renderContactSheet(day, result.candidates)))
      // stderr, not stdout: stdout is the data channel (plain text or --json),
      // and this confirmation would otherwise land after the JSON blob and
      // break `--json --png <path>` for anything parsing stdout.
      process.stderr.write(`wrote ${path}\n`)
    } catch (error) {
      return fail(`could not write ${path}: ${(error as Error).message}`)
    }
  }

  return 0
}

/* c8 ignore start */
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await run(process.argv.slice(2))
}
/* c8 ignore stop */
