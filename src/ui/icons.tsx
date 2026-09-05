import type { SVGProps } from 'react'

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

function Icon({ size = 22, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  )
}

export function UploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 16V4M6 10l6-6 6 6" />
      <path d="M4 20h16" />
    </Icon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 6l-6 6 6 6" />
    </Icon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  )
}

export function LessonsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </Icon>
  )
}

export function JournalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 4h13a1 1 0 0 1 1 1v15H6a2 2 0 0 0-2 2V5a1 1 0 0 1 1-1z" />
      <path d="M4 20a2 2 0 0 1 2-2h13" />
    </Icon>
  )
}

export function ReviewIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="6" width="14" height="15" rx="2" />
      <path d="M7 3h12a2 2 0 0 1 2 2v13" />
    </Icon>
  )
}

export function ReviewFilledIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="6" width="14" height="15" rx="2" fill="currentColor" />
      <path d="M7 3h12a2 2 0 0 1 2 2v13" />
    </Icon>
  )
}

export function BeforeLessonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  )
}

export function GlobeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="3.6" ry="9" />
      <path d="M3 12h18" />
    </Icon>
  )
}
