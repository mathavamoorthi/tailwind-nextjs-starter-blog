import { allAuthors, Author } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import AuthorLayout from '@/layouts/AuthorLayout'
import { coreContent } from 'pliny/utils/contentlayer'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({ title: 'About' })

// Enable ISR - revalidate every hour
export const revalidate = 3600

export default function Page() {
  const author = allAuthors.find((p) => p.slug === 'default') as Author | undefined

  if (!author) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">About</h1>
        <p>Author information not found.</p>
      </div>
    )
  }

  const mainContent = coreContent(author)

  return (
    <>
      <AuthorLayout content={mainContent}>
        {author.body?.code ? (
          <MDXLayoutRenderer code={author.body.code} />
        ) : (
          <div className="prose dark:prose-invert">
            <p>Hey I am {author.name}</p>
            {author.occupation && <p>I am a {author.occupation}</p>}
            {author.company && <p>I work at {author.company}</p>}
          </div>
        )}
      </AuthorLayout>
    </>
  )
}
