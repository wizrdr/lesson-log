import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@/i18n'
import { speak, useSpeechAvailable } from '@/lib/speech'
import { cn, IconButton, SpeakerIcon } from '@/ui'
import { parseFlow, parseInline, safeHref, type Inline } from './markup'

export function SayButton({ text, className }: { text: string; className?: string }) {
  const t = useT()
  const available = useSpeechAvailable()
  if (!available) return null
  return (
    <IconButton size="sm" label={t('course.listen')} className={cn('-my-2 align-middle text-muted', className)} onClick={() => speak(text)}>
      <SpeakerIcon />
    </IconButton>
  )
}

function renderNodes(nodes: Inline[]): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text':
        return <Fragment key={i}>{n.v}</Fragment>
      case 'br':
        return <br key={i} />
      case 'strong':
        return <strong key={i} className="font-semibold">{renderNodes(n.c)}</strong>
      case 'em':
        return <em key={i}>{renderNodes(n.c)}</em>
      case 'code':
        return <code key={i} className="rounded-sm bg-surface-raised px-1 font-sans text-[0.85em]">{n.v}</code>
      case 'pl':
        return <span key={i} lang="pl" className="font-semibold">{renderNodes(n.c)}</span>
      case 'say':
        return <SayButton key={i} text={n.v} />
      case 'link': {
        const link = safeHref(n.href)
        if (!link) return <Fragment key={i}>{renderNodes(n.c)}</Fragment>
        return link.kind === 'internal' ? (
          <Link key={i} to={link.href} className="underline decoration-border-strong underline-offset-2 hover:decoration-ink focus-ring">
            {renderNodes(n.c)}
          </Link>
        ) : (
          <a key={i} href={link.href} target="_blank" rel="noopener noreferrer" className="underline decoration-border-strong underline-offset-2 hover:decoration-ink focus-ring">
            {renderNodes(n.c)}
          </a>
        )
      }
    }
  })
}

export function RichInline({ md }: { md: string }) {
  return <>{renderNodes(parseInline(md))}</>
}

export function RichFlow({ md, className }: { md: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {parseFlow(md).map((b, i) =>
        b.t === 'p' ? (
          <p key={i} className="m-0">{renderNodes(b.c)}</p>
        ) : (
          <ul key={i} className="m-0 flex list-disc flex-col gap-1 pl-5">
            {b.items.map((it, j) => (
              <li key={j}>{renderNodes(it)}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}
