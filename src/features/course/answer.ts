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

const LETTER = /\p{L}/u

// The learner already knows the stem; the ending is what the drill is about, so that is what stays hidden.
function hideEnding(word: string): string {
  const letters = [...word].filter((c) => LETTER.test(c)).length
  if (letters <= 3) return word
  let hide = Math.max(2, Math.ceil(letters / 3))
  const chars = [...word]
  for (let i = chars.length - 1; i >= 0 && hide > 0; i--) {
    if (LETTER.test(chars[i])) {
      chars[i] = '·'
      hide--
    }
  }
  return chars.join('')
}

export function hintFor(answer: string): string {
  return answer.split(' ').map(hideEnding).join(' ')
}
