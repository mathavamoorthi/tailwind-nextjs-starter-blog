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

  // Normalize case (ctftime, CTFtime, CTFtime all resolved)
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
      className="flex items-center text-sm text-gray-500 transition hover:text-gray-600"
      target="_blank"
      rel="noopener noreferrer"
      href={href}
    >
      <span className="sr-only">{kind}</span>

      {isWide ? (
        <SocialSvg className="h-7 w-auto" />
      ) : (
        <SocialSvg className={`h-${size} w-${size}`} />
      )}
    </a>
  )
}

export default SocialIcon
