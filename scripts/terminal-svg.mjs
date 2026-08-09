// Render the CLI's real terminal output as an SVG, for the README.
//
// Runs the built CLI as a subprocess and converts its ANSI truecolour output
// rather than re-describing it: a hand-drawn mock drifts from the tool the
// first time the output changes, and nothing catches it. Regenerate with
//
//   npm run build && node scripts/terminal-svg.mjs 1098 3 docs/terminal.svg
//
// SVG rather than PNG so the text stays real text — crisp at any zoom, a few
// kB, and readable in a diff.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const [day = '1098', count = '3', out = 'docs/terminal.svg'] = process.argv.slice(2)

// Monospace advance at FONT_SIZE, rounded *up*: the SVG names a font stack, so
// the viewer picks the metrics and we cannot measure them from here. Erring
// high costs a few px of right margin; erring low clips the longest hex line.
const CHAR_W = 8.55
const LINE_H = 20
const PAD_X = 18
const PAD_Y = 46 // room for the title bar
const FONT_SIZE = 14
const BG = '#0E1116'
const CHROME = '#181D25'
const TEXT = '#E6E9EF'
const PROMPT = '#6ABF93'

/** Split one ANSI line into runs of plain text and background-coloured cells. */
function parseLine(line) {
  const segments = []
  const pattern = /\x1b\[48;2;(\d+);(\d+);(\d+)m([^\x1b]*)\x1b\[0m|([^\x1b]+)/g
  for (const m of line.matchAll(pattern)) {
    if (m[4] !== undefined) {
      segments.push({ text: m[4], bg: `rgb(${m[1]},${m[2]},${m[3]})` })
    } else if (m[5]) {
      segments.push({ text: m[5], bg: null })
    }
  }
  return segments
}

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const stdout = execFileSync('node', ['dist/cli.js', day, '--count', count], {
  encoding: 'utf8',
})
const output = stdout.split('\n')
while (output.length > 0 && output[output.length - 1].trim() === '') output.pop()
const lines = [`$ colorcreator ${day} --count ${count}`, '', ...output]

let widestCol = 0
const body = []

lines.forEach((line, row) => {
  const y = PAD_Y + row * LINE_H
  let col = 0
  for (const segment of parseLine(line)) {
    const x = PAD_X + col * CHAR_W
    const width = segment.text.length * CHAR_W
    if (segment.bg) {
      // Swatches are three spaces of background colour; draw the cell, not the text.
      body.push(
        `<rect x="${x.toFixed(1)}" y="${(y - 14).toFixed(1)}" width="${width.toFixed(1)}" height="${LINE_H}" fill="${segment.bg}"/>`,
      )
    } else if (segment.text.trim()) {
      const fill = row === 0 ? PROMPT : TEXT
      body.push(
        `<text x="${x.toFixed(1)}" y="${y}" fill="${fill}" xml:space="preserve">${escapeXml(segment.text)}</text>`,
      )
    }
    col += segment.text.length
    widestCol = Math.max(widestCol, col)
  }
})

const width = Math.ceil(PAD_X * 2 + widestCol * CHAR_W)
const height = Math.ceil(PAD_Y + (lines.length - 1) * LINE_H + PAD_X)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="${FONT_SIZE}">
<rect width="${width}" height="${height}" rx="8" fill="${BG}"/>
<rect width="${width}" height="28" rx="8" fill="${CHROME}"/>
<rect y="20" width="${width}" height="8" fill="${CHROME}"/>
<circle cx="18" cy="14" r="5" fill="#FF5F57"/>
<circle cx="36" cy="14" r="5" fill="#FEBC2E"/>
<circle cx="54" cy="14" r="5" fill="#28C840"/>
${body.join('\n')}
</svg>
`

writeFileSync(out, svg)
console.log(`wrote ${out} (${width}x${height}, ${lines.length} lines)`)
