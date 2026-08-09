import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * A licence that only exists in a package.json field is a claim, not a licence,
 * and a LICENSE file the metadata contradicts is worse — npm shows the field.
 * This project is published as a library, so the terms are the first thing a
 * consumer resolves. They have to agree, and they have to be the real text.
 */
describe('the licence', () => {
  it('is declared as AGPL-3.0-only', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(pkg.license).toBe('AGPL-3.0-only')
  })

  it('ships the full text, section 13 included', () => {
    const text = readFileSync('LICENSE', 'utf8')
    expect(text).toContain('GNU AFFERO GENERAL PUBLIC LICENSE')
    expect(text).toContain('Version 3, 19 November 2007')
    // Section 13 is the whole reason to pick AGPL over GPL for something that
    // can be put behind an HTTP endpoint.
    expect(text).toContain('Remote Network Interaction')
  })

  it('carries the notice on both entry points', () => {
    // dist/ is what gets installed, and it is built from these two files.
    for (const file of ['src/cli.ts', 'src/index.ts']) {
      const source = readFileSync(file, 'utf8')
      expect(source).toContain('GNU Affero General Public License')
      expect(source).toContain('Copyright (C) 2026  Cristhian Urrego')
    }
  })
})
