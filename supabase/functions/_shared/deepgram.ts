export interface DeepgramUtterance {
  start: number
  speaker?: number
  transcript: string
}

export interface DeepgramResponse {
  metadata?: { request_id?: string; duration?: number }
  results?: {
    utterances?: DeepgramUtterance[]
    channels?: { alternatives?: { transcript?: string; paragraphs?: { transcript?: string } }[] }[]
  }
  err_code?: string
  err_msg?: string
}

export function fmtTime(sec: number | null | undefined): string {
  if (sec == null || Number.isNaN(sec)) return '??:??'
  const s = Math.round(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(r).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function deepgramText(raw: DeepgramResponse): string {
  const utterances = raw.results?.utterances
  if (utterances?.length) {
    return utterances.map((u) => `[${fmtTime(u.start)}] Speaker ${u.speaker ?? 0}: ${u.transcript}`).join('\n') + '\n'
  }
  const alt = raw.results?.channels?.[0]?.alternatives?.[0]
  return (alt?.paragraphs?.transcript ?? alt?.transcript ?? '') + '\n'
}

export function deepgramError(raw: DeepgramResponse): string | null {
  if (raw.results) return null
  return raw.err_msg ?? raw.err_code ?? 'Deepgram returned no results'
}
