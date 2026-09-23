const DIACRITICS: Record<string, string> = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.!?,;:—–-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^ja /, '')
}

export function stripDiacritics(value: string): string {
  return normalize(value).replace(/[ąćęłńóśźż]/g, (c) => DIACRITICS[c])
}

export type Verdict = { kind: 'ok'; answer: string } | { kind: 'near'; answer: string } | { kind: 'bad' } | { kind: 'empty' }

// 'near' means the form is right and only diacritics are missing — reported apart from wrong forms.
export function checkAnswer(input: string, answers: string[]): Verdict {
  const typed = normalize(input)
  if (!typed) return { kind: 'empty' }
  const exact = answers.find((a) => normalize(a) === typed)
  if (exact) return { kind: 'ok', answer: exact }
  const flat = stripDiacritics(input)
  const near = answers.find((a) => stripDiacritics(a) === flat)
  if (near) return { kind: 'near', answer: near }
  return { kind: 'bad' }
}

function mask(word: string): string {
  return word[0] + '·'.repeat(Math.max(word.length - 1, 0))
}

export function hintFor(answer: string, level: 1 | 2): string {
  const words = answer.split(' ')
  return words.map((w, i) => (level === 2 && i === 0 ? w : mask(w))).join(' ')
}
