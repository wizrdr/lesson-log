const PALETTE =
  /\b(bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|accent|caret|shadow)-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/
const HEX = /#[0-9a-fA-F]{3,8}\b/

const sources = import.meta.glob<string>('/src/{features,ui}/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('tokens lint', () => {
  it('scans source files', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(0)
  })

  it('has no Tailwind palette classes or hex colors in src/features and src/ui', () => {
    const offenders: string[] = []
    for (const [file, content] of Object.entries(sources)) {
      content.split('\n').forEach((line, i) => {
        const hit = PALETTE.exec(line) ?? HEX.exec(line)
        if (hit) offenders.push(`${file}:${i + 1}  ${hit[0]}`)
      })
    }
    if (offenders.length) console.error(offenders.join('\n'))
    expect(offenders).toEqual([])
  })
})
