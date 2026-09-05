import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createLesson, uploadAudio } from '@/api/lessons'
import { confirmTutorConsent, createTutor } from '@/api/tutors'
import type { Tutor, TutorLanguage } from '@/api/types'
import { Button, Field, Input, Segmented, Select, Sheet, Toggle } from '@/ui'
import { LANGUAGE_LABELS, formatBytes, todayISO } from './format'

const NEW_TUTOR = 'new'
const STORAGE_LIMIT_BYTES = 50 * 1024 * 1024
const LANGUAGE_OPTIONS = (Object.keys(LANGUAGE_LABELS) as TutorLanguage[]).map((value) => ({
  value,
  label: LANGUAGE_LABELS[value],
}))

type Stage = 'idle' | 'tutor' | 'lesson' | 'upload'

const STAGE_TEXT: Record<Exclude<Stage, 'idle'>, string> = {
  tutor: 'Сохраняем репетитора…',
  lesson: 'Создаём урок…',
  upload: 'Загружаем файл…',
}

export interface UploadSheetProps {
  open: boolean
  onClose: () => void
  tutors: Tutor[]
  onTutorCreated: (tutor: Tutor) => void
}

export function UploadSheet({ open, onClose, tutors, onTutorCreated }: UploadSheetProps) {
  const navigate = useNavigate()
  const [tutorId, setTutorId] = useState('')
  const [name, setName] = useState('')
  const [language, setLanguage] = useState<TutorLanguage>('pl')
  const [consent, setConsent] = useState(false)
  const [date, setDate] = useState(todayISO)
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const lessonIdRef = useRef<string | null>(null)

  function close() {
    setTutorId('')
    setName('')
    setLanguage('pl')
    setConsent(false)
    setDate(todayISO())
    setFile(null)
    setError(null)
    lessonIdRef.current = null
    onClose()
  }

  const effectiveTutorId = tutorId || tutors[0]?.id || NEW_TUTOR
  const selected = tutors.find((t) => t.id === effectiveTutorId) ?? null
  const isNew = selected === null
  const needsConsent = isNew || selected.consent_at === null
  const busy = stage !== 'idle'
  const tooBig = file !== null && file.size > STORAGE_LIMIT_BYTES
  const canSubmit =
    !busy && file !== null && date !== '' && (isNew ? name.trim() !== '' : true) && (!needsConsent || consent)

  async function submit() {
    if (!file || !canSubmit) return
    setError(null)
    try {
      let tutor = selected
      if (!tutor) {
        setStage('tutor')
        tutor = await createTutor({ name, language, consent })
        onTutorCreated(tutor)
        setTutorId(tutor.id)
      } else if (tutor.consent_at === null) {
        setStage('tutor')
        await confirmTutorConsent(tutor.id)
      }
      if (!lessonIdRef.current) {
        setStage('lesson')
        lessonIdRef.current = (await createLesson({ tutorId: tutor.id, date })).id
      }
      setStage('upload')
      await uploadAudio(lessonIdRef.current, file)
      navigate(`/lessons/${lessonIdRef.current}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setStage('idle')
    }
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Загрузить урок"
      footer={
        <div className="flex flex-col gap-2">
          {busy && <p className="text-center text-sm text-muted">{STAGE_TEXT[stage]}</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button full disabled={!canSubmit} loading={busy} onClick={() => void submit()}>
            Загрузить
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {tutors.length > 0 && (
          <Field label="Репетитор">
            <Select aria-label="Репетитор" value={effectiveTutorId} onChange={(e) => setTutorId(e.target.value)}>
              {tutors.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {LANGUAGE_LABELS[t.language]}
                </option>
              ))}
              <option value={NEW_TUTOR}>Новый репетитор</option>
            </Select>
          </Field>
        )}

        {isNew && (
          <>
            <Field label="Имя репетитора">
              <Input
                aria-label="Имя репетитора"
                autoFocus={tutors.length === 0}
                value={name}
                placeholder="Анна"
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Язык">
              <Segmented options={LANGUAGE_OPTIONS} value={language} onChange={(v) => setLanguage(v as TutorLanguage)} />
            </Field>
          </>
        )}

        {needsConsent && (
          <div className="flex flex-col gap-1">
            <Toggle label="Репетитор предупреждён о записи" checked={consent} onChange={setConsent} />
            <p className="text-sm text-muted">Без согласия репетитора урок записывать нельзя.</p>
          </div>
        )}

        <Field label="Дата урока">
          <Input aria-label="Дата урока" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="Запись" hint="Zoom: audio_only.m4a из локальной записи. iPhone: файл из Диктофона.">
          <input
            aria-label="Запись урока"
            type="file"
            accept="audio/*,video/mp4,.m4a"
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted file:mr-3 file:min-h-10 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:font-medium file:text-accent"
          />
          {file && (
            <p className="text-sm text-muted">
              {file.name} · {formatBytes(file.size)}
            </p>
          )}
          {tooBig && (
            <p className="text-sm text-warning">
              Файл больше 50 МБ — это лимит Storage на бесплатном тарифе, загрузка может не пройти.
            </p>
          )}
        </Field>
      </div>
    </Sheet>
  )
}

export default UploadSheet
