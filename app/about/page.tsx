import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({ title: 'About' })

// Enable ISR - revalidate every hour
export const revalidate = 3600

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">About</h1>
      <div className="prose dark:prose-invert">
        <p>
          Hey, we are Team Nova. This is the about page for our CTF / blog site.
        </p>
        <p>
          The main purpose of this site is to share writeups, announcements, and technical content
          from our team members.
        </p>
        <p>
          If you are reading this in production, it means the blog build is working fine and all
          static pages are being generated correctly.
        </p>
      </div>
    </div>
  )
}
