export type LessonStatus = 'uploaded' | 'transcribing' | 'extracting' | 'ready' | 'failed'
export type EntryType = 'correction' | 'vocab' | 'rule'
export type TutorLanguage = 'pl' | 'en'

export interface Tutor {
  id: string
  user_id: string
  name: string
  language: TutorLanguage
  consent_at: string | null
  created_at: string
}

export interface Lesson {
  id: string
  user_id: string
  tutor_id: string
  date: string
  audio_path: string | null
  transcript: string | null
  status: LessonStatus
  error: string | null
  transcription_request_id: string | null
  created_at: string
}

export interface Entry {
  id: string
  lesson_id: string
  user_id: string
  type: EntryType
  original: string
  corrected: string | null
  explanation: string | null
  quote: string | null
  created_at: string
  deleted_at: string | null
}

export interface CardRow {
  entry_id: string
  user_id: string
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: 0 | 1 | 2 | 3
  last_review: string | null
}
