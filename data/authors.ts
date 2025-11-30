export type Author = {
  slug: string           // URL: /authors/[slug]
  name: string           // display name
  role?: string          // optional title
  avatar?: string        // /static/images/authors/<slug>.png
  email?: string         // optional
  linkedin?: string      // optional
}

export const authors: Author[] = [
  { slug: "l4tmur", name: "L4tmur", role: "DFIR & Web Security", avatar: "/static/images/authors/l4tmur.png" },
  { slug: "spideyy", name: "Spideyy", role: "Web & App Security", avatar: "/static/images/authors/spideyy.png" },
  { slug: "bruceleo", name: "Bruce Leo", role: "Web Security", avatar: "/static/images/authors/bruceleo.png" },
  { slug: "oxbumblebee", name: "Oxbumblebee", role: "Web Security & OSINT", avatar: "/static/images/authors/oxbumblebee.png" },
  { slug: "0xhyder0", name: "Oxhyder0", role: "Binary Exploitation", avatar: "/static/images/authors/hyder.png" },
  { slug: "jjkings", name: "JJ Kings", role: "Reverse Engineering", avatar: "/static/images/authors/jjkings.png" },
  { slug: "jonsnow", name: "Jon Snow", role: "Web Security", avatar: "/static/images/authors/jonsnow.png" },
  { slug: "pop3ye", name: "POp3ye", role: "DFIR", avatar: "/static/images/authors/pop3ye.png" },
  { slug: "groot", name: "Groot", role: "Android", avatar: "/static/images/authors/groot.png" },
  { slug: "rguy", name: "Rguy", role: "Binary Exploitation", avatar: "/static/images/authors/rguy.png" },
  { slug: "arul_sujith", name: "Arul Sujith", role: "Cryptography", avatar: "/static/images/authors/arul_sujith.png" },
  { slug: "hex", name: "Hex", role: "OSINT & Web Security", avatar: "/static/images/authors/hex.png" },
]
