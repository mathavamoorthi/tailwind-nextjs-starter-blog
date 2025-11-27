export type Author = {
  slug: string           // URL: /authors/[slug]
  name: string           // display name
  role?: string          // optional title
  avatar?: string        // /static/images/authors/<slug>.png
  email?: string         // optional
  linkedin?: string      // optional
}

export const authors: Author[] = [
  { slug: "l4tmur", name: "L4tmur", role: "Founder of NOVA", avatar: "/static/images/authors/l4tmur.png" },
  { slug: "spideyy", name: "Spideyy", role: "Nova Team Member", avatar: "/static/images/authors/spideyy.png" },
  { slug: "bruceleo", name: "Bruce Leo", role: "Nova Team Member", avatar: "/static/images/authors/bruceleo.png" },
  { slug: "oxbumblebee", name: "Oxbumblebee", role: "Nova Team Member", avatar: "/static/images/authors/oxbumblebee.png" },
  { slug: "oxhyder0", name: "Oxhyder0", role: "Nova Team Member", avatar: "/static/images/authors/hyder.png" },
  { slug: "jjkings", name: "JJ Kings", role: "Nova Team Member", avatar: "/static/images/authors/jjkings.png" },
  { slug: "jonsnow", name: "Jon Snow", role: "Nova Team Member", avatar: "/static/images/authors/jonsnow.png" },
  { slug: "pop3ye", name: "POp3ye", role: "Nova Team Member", avatar: "/static/images/authors/pop3ye.png" },
  { slug: "groot", name: "Groot", role: "Nova Team Member", avatar: "/static/images/authors/groot.png" },
  { slug: "rguy", name: "Rguy", role: "Nova Team Member", avatar: "/static/images/authors/rguy.png" },
  { slug: "arul_sujith", name: "Arul Sujith", role: "Nova Team Member", avatar: "/static/images/authors/arul_sujith.png" },
  { slug: "hex", name: "Hex", role: "Nova Team Member", avatar: "/static/images/authors/hex.png" },
  { slug: "homelander", name: "Homelander", role: "Nova Team Member", avatar: "/static/images/authors/homelander.png" },
  { slug: "kriz", name: "Kriz", role: "Nova Team Member", avatar: "/static/images/authors/kriz.png" },
  { slug: "razz", name: "Razz", role: "Nova Team Member", avatar: "/static/images/authors/razz.png" },
  { slug: "shadoweternity", name: "Shadow Eternity", role: "Nova Team Member", avatar: "/static/images/authors/shadoweternity.png" },
]
