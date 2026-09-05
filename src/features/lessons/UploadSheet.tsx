import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createLesson, uploadAudio } from '@/api/lessons'
import { confirmTutorConsent, createTutor } from '@/api/tutors'
import type { Tutor, TutorLanguage } from '@/api/types'
import { useErrorText, useT } from '@/i18n'
import { Button, Field, Input, Segmented, Select, Sheet, Toggle } from '@/ui'
import { formatBytes, todayISO } from './format'

const NEW_TUTOR = 'new'
const STORAGE_LIMIT_BYTES = 50 * 1024 * 1024
const TUTOR_LANGUAGES: TutorLanguage[] = ['pl', 'en']

type Stage = 'idle' | 'tutor' | 'lesson' | 'upload'

export interface UploadSheetProps {
  open: boolean
  onClose: () => void
  tutors: Tutor[]
  onTutorCreated: (tutor: Tutor) => void
}

export function UploadSheet({ open, onClose, tutors, onTutorCreated }: UploadSheetProps) {
  const navigate = useNavigate()
  const t = useT()
  const errorText = useErrorText()
  const [tutorId, setTutorId] = useState('')
  const [name, setName] = useState('')
  const [language, setLanguage] = useState<TutorLanguage>('pl')
  const [consent, setConsent] = useState(false)
  const [date, setDate] = useState(todayISO)
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<unknown>(null)
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
      setError(e)
    } finally {
      setStage('idle')
    }
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={t('upload.title')}
      footer={
        <div className="flex flex-col gap-2">
          {stage !== 'idle' && <p className="text-center text-[13px] text-muted">{t(`upload.stage.${stage}`)}</p>}
          {error !== null && <p className="text-[13px] text-pen-red">{errorText(error)}</p>}
          <Button full disabled={!canSubmit} loading={busy} onClick={() => void submit()}>
            {t('upload.submit')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {tutors.length > 0 && (
          <Field label={t('upload.tutor')}>
            <Select aria-label={t('upload.tutor')} value={effectiveTutorId} onChange={(e) => setTutorId(e.target.value)}>
              {tutors.map((tutor) => (
                <option key={tutor.id} value={tutor.id}>
                  {tutor.name} · {t(`language.${tutor.language}`)}
                </option>
              ))}
              <option value={NEW_TUTOR}>{t('upload.newTutor')}</option>
            </Select>
          </Field>
        )}

        {isNew && (
          <>
            <Field label={t('upload.tutorName')}>
              <Input
                aria-label={t('upload.tutorName')}
                autoFocus={tutors.length === 0}
                value={name}
                placeholder={t('upload.tutorNamePlaceholder')}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label={t('upload.language')}>
              <Segmented
                options={TUTOR_LANGUAGES.map((value) => ({ value, label: t(`language.${value}`) }))}
                value={language}
                onChange={(v) => setLanguage(v as TutorLanguage)}
              />
            </Field>
          </>
        )}

        {needsConsent && (
          <div className="flex flex-col gap-1">
            <Toggle label={t('upload.consent')} checked={consent} onChange={setConsent} />
            <p className="text-[13px] text-muted">{t('upload.consentHint')}</p>
          </div>
        )}

        <Field label={t('upload.date')}>
          <Input aria-label={t('upload.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label={t('upload.file')} hint={t('upload.fileHint')}>
          <input
            aria-label={t('upload.fileAria')}
            type="file"
            accept="audio/*,video/mp4,.m4a"
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted file:mr-3 file:min-h-10 file:rounded-full file:border-[1.5px] file:border-solid file:border-ink file:bg-transparent file:px-4 file:font-semibold file:text-text"
          />
          {file && (
            <p className="text-[13px] text-muted">
              {file.name} · {formatBytes(file.size, t)}
            </p>
          )}
          {tooBig && <p className="text-[13px] text-amber-text">{t('upload.tooBig')}</p>}
        </Field>
      </div>
    </Sheet>
  )
}

export default UploadSheet
