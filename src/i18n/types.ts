import type { ru } from './ru'

export type Lang = 'ru' | 'en'

export type PluralForms = { other: string } & Partial<Record<'zero' | 'one' | 'two' | 'few' | 'many', string>>

export type Dictionary = { readonly [K in keyof typeof ru]: (typeof ru)[K] extends string ? string : PluralForms }

export type TextKey = { [K in keyof Dictionary]: Dictionary[K] extends string ? K : never }[keyof Dictionary]
export type PluralKey = Exclude<keyof Dictionary, TextKey>

type StripError<K> = K extends `error.${infer C}` ? C : never
export type ApiErrorCode = StripError<TextKey>

export type Params = Record<string, string | number>

export interface Translate {
  (key: TextKey, params?: Params): string
  plural(key: PluralKey, n: number, params?: Params): string
}
