export type Inline =
  | { t: 'text'; v: string }
  | { t: 'br' }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'pl'; c: Inline[] }
  | { t: 'say'; v: string }
  | { t: 'link'; href: string; c: Inline[] }

export type Flow = { t: 'p'; c: Inline[] } | { t: 'ul'; items: Inline[][] }

function closingBrace(s: string, from: number): number {
  let depth = 1
  for (let i = from; i < s.length; i++) {
    if (s[i] === '{') depth++
    else if (s[i] === '}' && --depth === 0) return i
  }
  return -1
}

function closingSingleStar(s: string, from: number): number {
  for (let i = from; i < s.length; i++) {
    if (s[i] !== '*') continue
    if (s[i + 1] === '*') { i++; continue }
    return i
  }
  return -1
}

export function parseInline(s: string): Inline[] {
  const out: Inline[] = []
  let buf = ''
  const flush = () => { if (buf) { out.push({ t: 'text', v: buf }); buf = '' } }
  let i = 0
  while (i < s.length) {
    const rest = s.slice(i)
    if (s[i] === '\n') { flush(); out.push({ t: 'br' }); i++; continue }
    if (rest.startsWith('{pl:') || rest.startsWith('{say:')) {
      const open = rest.startsWith('{pl:') ? 4 : 5
      const end = closingBrace(s, i + 1)
      if (end !== -1) {
        flush()
        const inner = s.slice(i + open, end)
        out.push(open === 4 ? { t: 'pl', c: parseInline(inner) } : { t: 'say', v: inner })
        i = end + 1
        continue
      }
    }
    if (rest.startsWith('**')) {
      const end = s.indexOf('**', i + 2)
      if (end !== -1) { flush(); out.push({ t: 'strong', c: parseInline(s.slice(i + 2, end)) }); i = end + 2; continue }
    }
    if (s[i] === '*') {
      const end = closingSingleStar(s, i + 1)
      if (end !== -1) { flush(); out.push({ t: 'em', c: parseInline(s.slice(i + 1, end)) }); i = end + 1; continue }
    }
    if (s[i] === '`') {
      const end = s.indexOf('`', i + 1)
      if (end !== -1) { flush(); out.push({ t: 'code', v: s.slice(i + 1, end) }); i = end + 1; continue }
    }
    if (s[i] === '[') {
      const mid = s.indexOf('](', i)
      const end = mid === -1 ? -1 : s.indexOf(')', mid + 2)
      if (mid !== -1 && end !== -1) {
        flush()
        out.push({ t: 'link', href: s.slice(mid + 2, end), c: parseInline(s.slice(i + 1, mid)) })
        i = end + 1
        continue
      }
    }
    buf += s[i]
    i++
  }
  flush()
  return out
}

export function parseFlow(md: string): Flow[] {
  const out: Flow[] = []
  for (const para of md.split(/\n{2,}/)) {
    const lines = para.split('\n')
    let text: string[] = []
    let list: string[] = []
    const flushText = () => { if (text.length) { out.push({ t: 'p', c: parseInline(text.join('\n')) }); text = [] } }
    const flushList = () => { if (list.length) { out.push({ t: 'ul', items: list.map(parseInline) }); list = [] } }
    for (const line of lines) {
      if (line.startsWith('- ')) { flushText(); list.push(line.slice(2)) }
      else { flushList(); text.push(line) }
    }
    flushText()
    flushList()
  }
  return out.filter((f) => f.t === 'ul' || f.c.length > 0)
}

export function plainText(nodes: Inline[]): string {
  return nodes.map((n) => ('v' in n ? (n.t === 'say' ? '' : n.v) : n.t === 'br' ? ' ' : plainText(n.c))).join('')
}

export type SafeHref = { kind: 'internal' | 'external'; href: string } | null

// Only same-app paths and http(s)/mailto links render as links; anything else stays plain text.
export function safeHref(href: string): SafeHref {
  if (href.startsWith('/') && href[1] !== '/' && href[1] !== '\\') return { kind: 'internal', href }
  try {
    const url = new URL(href)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? { kind: 'external', href } : null
  } catch {
    return null
  }
}
