import { useCallback, useSyncExternalStore } from 'react'
import { ApiError } from '@/api/client'
import { en } from './en'
import { ru } from './ru'
import { getLang, setLang, subscribe } from './store'
import type { Dictionary, Lang, Params, PluralKey, TextKey, Translate } from './types'

export { LanguageProvider } from './LanguageProvider'
export { LANGS, detectLang, getLang, isLang, setLang } from './store'
export type { ApiErrorCode, Lang, PluralKey, TextKey, Translate } from './types'

const DICTS: Record<Lang, Dictionary> = { ru, en }
const cache = new Map<Lang, Translate>()

function interpolate(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match))
}

export function translate(lang: Lang): Translate {
  const cached = cache.get(lang)
  if (cached) return cached
  const dict = DICTS[lang]
  const rules = new Intl.PluralRules(lang)
  const t = ((key: TextKey, params?: Params) => interpolate(dict[key], params)) as Translate
  t.plural = (key: PluralKey, n: number, params?: Params) => {
    const forms = dict[key]
    return interpolate(forms[rules.select(n)] ?? forms.other, { n, ...params })
  }
  cache.set(lang, t)
  return t
}

export function useLocale(): { lang: Lang; setLang: (lang: Lang) => void } {
  const lang = useSyncExternalStore(subscribe, getLang)
  return { lang, setLang }
}

export function useT(): Translate {
  return translate(useSyncExternalStore(subscribe, getLang))
}

export function describeError(e: unknown, t: Translate): string {
  if (e instanceof ApiError) {
    const base = t(`error.${e.code}`)
    return e.detail ? `${base}: ${e.detail}` : base
  }
  return e instanceof Error ? e.message : String(e)
}

export function useErrorText(): (e: unknown) => string {
  const t = useT()
  return useCallback((e: unknown) => describeError(e, t), [t])
}
