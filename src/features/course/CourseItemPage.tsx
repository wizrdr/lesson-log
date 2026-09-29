import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import type { ChoiceItem, DrillItem } from '../../../supabase/functions/_shared/course-input.ts'
import { getCourseItem, importCards, loadProgress, saveProgress, type BlockState, type CourseItem, type ProgressMap } from '@/api/course'
import { Page } from '@/app/Page'
import { formatLessonDate } from '@/features/lessons/format'
import { useErrorText, useLocale, useT } from '@/i18n'
import { Button, CheckIcon, cn } from '@/ui'
import { Choice } from './blocks/Choice'
import { Drill } from './blocks/Drill'
import { Checklist, Quiz, Recall } from './blocks/Interactive'
import { Callout, Dialog, Heading, Table, Text } from './blocks/Simple'
import { missCard } from './missCard'
import { DONE_MARKER } from './plan'
import { notifyProgressSaved } from './progressBus'

// Progress row that marks the lesson's cards as imported, so reopening does not re-import.
export const CARDS_MARKER = '_cards'

export interface CourseItemPageProps {
  embedded?: boolean
  action?: ReactNode
  centered?: boolean
}

export function CourseItemPage({ embedded = false, action, centered = false }: CourseItemPageProps) {
  const { slug = '' } = useParams()
  const t = useT()
  const errorText = useErrorText()
  const [item, setItem] = useState<CourseItem | null>(null)
  const [progress, setProgress] = useState<ProgressMap>({})
  const [loadError, setLoadError] = useState<unknown>(null)
  const [saveError, setSaveError] = useState<unknown>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const progressRef = useRef<ProgressMap>({})
  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    let alive = true
    getCourseItem(slug)
      .then(async (it) => {
        const p = await loadProgress(it.id)
        if (!alive) return
        setItem(it)
        setProgress(p)
        if (it.kind === 'lesson' && it.cards.length > 0 && !p[CARDS_MARKER]) {
          const r = await importCards(it.cards)
          const marker = { imported: true, created: r.created, skipped: r.skipped }
          await saveProgress(it.id, CARDS_MARKER, marker)
          if (!alive) return
          setProgress((prev) => ({ ...prev, [CARDS_MARKER]: marker }))
          setNotice(r.created > 0 ? t('course.cardsAdded', { cards: t.plural('cards', r.created) }) : t('course.cardsInDeck'))
        }
      })
      .catch((e) => alive && setLoadError(e))
    return () => {
      alive = false
    }
  }, [slug, t])

  const update = useCallback(
    (blockId: string, state: BlockState) => {
      if (!item) return
      const before = progressRef.current[blockId]
      setProgress((prev) => ({ ...prev, [blockId]: state }))
      setSaveError(null)
      saveProgress(item.id, blockId, state).then(notifyProgressSaved, (e) => {
        setProgress((prev) => ({ ...prev, [blockId]: before }))
        setSaveError(e)
      })
    },
    [item],
  )

  const onMiss = useCallback(
    (drillItem: DrillItem, typed: string) => {
      if (!item || !typed) return
      importCards([missCard(drillItem, item.slug)])
        .then(() => setNotice(t('course.missSaved')))
        .catch(setSaveError)
    },
    [item, t],
  )

  const onChoiceMiss = useCallback(
    (choice: ChoiceItem) => onMiss({ id: choice.id, prompt: choice.prompt, answers: [choice.answer], note: choice.note, hint: null }, choice.answer),
    [onMiss],
  )

  if (loadError !== null) return <p className="px-6 pt-6 text-[13px] leading-5 text-pen-red">{errorText(loadError)}</p>
  if (!item) return <div className="h-24" aria-busy />

  return (
    <Page
      title={item.title}
      subtitle={item.subtitle ?? undefined}
      width={embedded || centered ? 'list' : 'lesson'}
      className={centered ? 'mx-auto max-w-[860px]' : undefined}
      back={embedded ? undefined : { to: '/course', label: t('course.title') }}
      action={action}
    >
      <div className={cn('pb-10', !centered && 'max-w-[720px]')} data-testid="course-item">
        {item.body.map((block) => {
          const state = progress[block.id]
          const onChange = (s: BlockState) => update(block.id, s)
          switch (block.type) {
            case 'heading': return <Heading key={block.id} block={block} />
            case 'text': return <Text key={block.id} block={block} />
            case 'callout': return <Callout key={block.id} block={block} />
            case 'table': return <Table key={block.id} block={block} />
            case 'dialog': return <Dialog key={block.id} block={block} />
            case 'drill': return <Drill key={block.id} block={block} state={state} onChange={onChange} onMiss={onMiss} />
            case 'choice': return <Choice key={block.id} block={block} state={state} onChange={onChange} onMiss={onChoiceMiss} />
            case 'quiz': return <Quiz key={block.id} block={block} state={state} onChange={onChange} />
            case 'recall': return <Recall key={block.id} block={block} state={state} onChange={onChange} />
            case 'checklist': return <Checklist key={block.id} block={block} state={state} onChange={onChange} />
          }
        })}
        {item.kind !== 'reference' && (
          <DoneBar kind={item.kind} state={progress[DONE_MARKER]} onChange={(s) => update(DONE_MARKER, s)} />
        )}
      </div>
      {(notice !== null || saveError !== null) && (
        <div className="paper hairline-t sticky bottom-0 px-6 py-3" role="status">
          {saveError !== null ? (
            <p className="m-0 text-[13px] leading-5 text-pen-red">{errorText(saveError)}</p>
          ) : (
            <p className="m-0 text-[13px] leading-5 text-muted">{notice}</p>
          )}
        </div>
      )}
    </Page>
  )
}

function DoneBar({ kind, state, onChange }: { kind: 'lesson' | 'week'; state: BlockState | undefined; onChange: (s: BlockState) => void }) {
  const t = useT()
  const { lang } = useLocale()
  const done = state?.done === true
  const at = typeof state?.at === 'string' ? state.at : null
  return (
    <div className="hairline-t mx-6 mt-8 flex flex-wrap items-center gap-3 pt-5" data-testid="done-bar">
      {done ? (
        <>
          <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-ink-green">
            <CheckIcon size={18} />
            {at ? t(kind === 'lesson' ? 'course.lessonDoneOn' : 'course.weekDoneOn', { date: formatLessonDate(at, lang) }) : t('course.doneMark')}
          </span>
          <Button variant="ghost" size="sm" onClick={() => onChange({ done: false })}>
            {t('course.undoDone')}
          </Button>
        </>
      ) : (
        <Button variant="secondary" onClick={() => onChange({ done: true, at: new Date().toISOString() })}>
          {t(kind === 'lesson' ? 'course.lessonDone' : 'course.weekDone')}
        </Button>
      )}
    </div>
  )
}
