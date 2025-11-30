import { Linkedin, Instagram, HackTheBox, CtfTime } from './icons'

const components = {
  linkedin: Linkedin,
  instagram: Instagram,
  hackthebox: HackTheBox,
  ctftime: CtfTime,
} as const

type KnownKind = keyof typeof components

type SocialIconProps = {
  kind: KnownKind | string
  href?: string
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

  const lookupKey = (typeof kind === 'string' ? kind.toLowerCase() : String(kind)) as KnownKind
  const SocialSvg = components[lookupKey]

  if (!SocialSvg) {
    console.warn(
      `[SocialIcon] Unknown kind "${kind}". Make sure it’s exported in components/social-icons/icons.tsx and imported here.`
    )
    return null
  }

  const isWide = lookupKey === 'hackthebox' || lookupKey === 'ctftime'

  return (
    <a
      className="flex items-center text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition"
      target="_blank"
      rel="noopener noreferrer"
      href={href}
    >
      <span className="sr-only">{kind}</span>

      {isWide ? (
        // HTB + CTFtime (image/text logos)
        <SocialSvg className="h-7 w-auto" />
      ) : (
        // Normal SVG icons (LinkedIn, Instagram) — use currentColor for fill
        <SocialSvg className={`h-${size} w-${size} fill-current`} />
      )}
    </a>
  )
}

export default SocialIcon
