import { client, unwrap, check } from './client'
import type { Tutor, TutorLanguage } from './types'

export interface CreateTutorInput {
  name: string
  language: TutorLanguage
  consent: boolean
}

export async function listTutors(): Promise<Tutor[]> {
  const result = await client().from('tutors').select('*').order('name')
  return unwrap<Tutor[]>(result, 'Не удалось загрузить репетиторов')
}

export async function createTutor({ name, language, consent }: CreateTutorInput): Promise<Tutor> {
  const result = await client()
    .from('tutors')
    .insert({ name: name.trim(), language, consent_at: consent ? new Date().toISOString() : null })
    .select('*')
    .single()
  return unwrap<Tutor>(result, 'Не удалось сохранить репетитора')
}

export async function confirmTutorConsent(id: string): Promise<void> {
  const result = await client().from('tutors').update({ consent_at: new Date().toISOString() }).eq('id', id)
  check(result, 'Не удалось сохранить согласие репетитора')
}
