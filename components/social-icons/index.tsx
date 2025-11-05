// --- replace the existing components + SocialIcon block with this ---

import { Linkedin, Instagram, HackTheBox, CtfTime } from './icons'

const components = {
  linkedin: Linkedin,
  instagram: Instagram,
  hackthebox: HackTheBox,
  ctftime: CtfTime,
} as const

type KnownKind = keyof typeof components

type SocialIconProps = {
  // accept either a known kind or any string (we'll handle unknown/case-insensitive)
  kind: KnownKind | string
  href: string | undefined
  size?: number
}

const SocialIcon = ({ kind, href, size = 8 }: SocialIconProps) => {
  if (
    !href ||
    (String(kind).toLowerCase() === 'mail' &&
      !/^mailto:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(href))
  ) {
    return null
  }

  // make lookup case-insensitive: allow "CTFtime", "Ctftime", "ctftime", etc.
  const lookupKey = (typeof kind === 'string' ? kind.toLowerCase() : String(kind)) as KnownKind

  const SocialSvg = components[lookupKey]

  if (!SocialSvg) {
    // helpful runtime warning (you saw this message earlier)
    // keep returning null instead of crashing the whole app
    console.warn(
      `[SocialIcon] Unknown kind "${kind}". Make sure it’s exported in components/social-icons/icons.tsx and imported here.`
    )
    return null
  }

  return (
    <a
      className="text-sm text-gray-500 transition hover:text-gray-600"
      target="_blank"
      rel="noopener noreferrer"
      href={href}
    >
      <span className="sr-only">{kind}</span>
      <SocialSvg
        className={`hover:text-primary-500 dark:hover:text-primary-400 fill-current text-gray-700 dark:text-gray-200 h-${size} w-${size}`}
      />
    </a>
  )
}

export default SocialIcon
