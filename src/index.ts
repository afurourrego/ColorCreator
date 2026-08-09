/*
 * ColorCreator — deterministic BasePaint palette generator, seeded by day number.
 * Copyright (C) 2026  Cristhian Urrego
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version. See LICENSE for the full text.
 */

export { generate } from './core/generate.js'
export type {
  GenerateOptions,
  GenerateResult,
  SkippedStrategy,
} from './core/generate.js'
export { STRATEGIES, STRATEGY_IDS, findStrategy } from './strategies/index.js'
export type { Strategy } from './strategies/index.js'
/**
 * The catalogue is only browsable without these. `strategy.generate(rng, k)`
 * needs an `Rng`, and there was no exported way to obtain one — so a consumer
 * could read a strategy's metadata and then do nothing with it.
 */
export { makeRng, seedFor } from './core/rng.js'
export type { Rng } from './core/rng.js'
export type { Candidate, Oklch } from './core/types.js'
