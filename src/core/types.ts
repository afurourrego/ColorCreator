/** A colour in the OKLCH space: l in [0,1], c in [0,0.4], h in [0,360). */
export type Oklch = { l: number; c: number; h: number }

/** Three 8-bit sRGB channels. */
export type Rgb = [number, number, number]

/** One generated palette, ready to propose. */
export type Candidate = {
  /** id of the strategy that produced it */
  strategy: string
  /** sRGB hex strings, between 2 and 16 of them, in ramp order */
  colors: string[]
  /** 0-100; orders candidates, never rejects them */
  score: number
}
