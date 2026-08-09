/**
 * A palette must contain a colour at least this dark.
 *
 * Real palettes: median min(L) 0.270, p10 0.122, p90 0.454. The anchor is what an
 * artist reaches for to draw outlines and shadows; a palette without one is
 * pretty and unpaintable. 60.9% of real palettes clear this bar.
 */
export const DARK_ANCHOR_L_MAX = 0.3

/**
 * And a colour at least this light, for highlights.
 * Real palettes: median max(L) 0.928, p10 0.779. 78.2% clear this bar.
 */
export const LIGHT_ANCHOR_L_MIN = 0.85

/**
 * Minimum spread between the darkest and lightest colour.
 *
 * Redundant with the two anchors in the common case, but it also rejects the
 * palette that satisfies both anchors with two near-identical colours at each
 * end. Real palettes: median span 0.632, p10 0.414. 69.1% clear this bar.
 */
export const L_SPAN_MIN = 0.55

/** Median chroma of a single colour across all real palettes. */
export const CHROMA_MEDIAN = 0.082

/**
 * Bounds on a palette's mean chroma: below is washed out, above is radioactive.
 * Per-colour chroma in real palettes: p10 0.017, median 0.082, p90 0.171.
 * 89.4% of real palettes fall inside this band.
 */
export const CHROMA_MEAN_MIN = 0.04
export const CHROMA_MEAN_MAX = 0.16

/**
 * Minimum OKLab distance between any two colours is `SEPARATION_NUMERATOR / k`.
 *
 * The threshold has to scale with palette size — 16 colours inevitably pack the
 * space more tightly than 4 — and a single fixed number would either wave
 * through mush at k=16 or reject every legitimate large palette. Measured
 * against the 10th percentile of real palettes grouped by size, 0.40/k tracks
 * the real curve across the whole range:
 *
 *   k          2      4      6      8     10     12     16
 *   real p10   0.218  0.088  0.059  0.053  0.047  0.026  0.029
 *   0.40 / k   0.200  0.100  0.067  0.050  0.040  0.033  0.025
 *
 * This is not an aesthetic rule. Two colours an artist cannot tell apart are a
 * palette slot they cannot use.
 */
export const SEPARATION_NUMERATOR = 0.4

/** Resamples allowed before a strategy gives up on a day. */
export const MAX_ATTEMPTS = 8

export const COLOR_COUNT_MIN = 2
export const COLOR_COUNT_MAX = 16

/**
 * How often each palette size appears in the 1093 real palettes. Used as
 * sampling weights, so generated sizes follow the same distribution BasePaint
 * already uses — 4 to 8 colours dominate, with a real tail at 16.
 *
 * The four historical palettes with 17, 20, 21 and 24 colours are excluded:
 * the spec caps K at 16.
 */
export const COLOR_COUNT_WEIGHTS: Record<number, number> = {
  2: 21,
  3: 30,
  4: 192,
  5: 223,
  6: 139,
  7: 102,
  8: 158,
  9: 42,
  10: 37,
  11: 32,
  12: 28,
  13: 13,
  14: 25,
  15: 9,
  16: 38,
}
