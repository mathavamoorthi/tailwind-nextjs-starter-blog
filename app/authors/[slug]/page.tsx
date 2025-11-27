// app/authors/[slug]/page.tsx

import Image from 'next/image'
import { notFound } from 'next/navigation'
import { allBlogs } from 'contentlayer/generated'
import { formatDate } from 'pliny/utils/formatDate'
import siteMetadata from '@/data/siteMetadata'
import { authors } from '@/data/authors'
import Link from '@/components/Link'
import Tag from '@/components/Tag'

export const dynamicParams = true

export default function AuthorPage({ params }: any) {
  const slug = params.slug as string

  // 1) Find author info from data/authors.ts
  const author = authors.find((a) => a.slug === slug)

  if (!author) {
    return notFound()
  }

  // 2) Filter posts that belong to this author
  //    We match by author.name in the MDX frontmatter authors: ['Bruce Leo', ...]
  const authorPosts = allBlogs
    .filter((post) => {
      const isDraft = (post as any).draft === true
      if (isDraft) return false

      const postAuthors = (post as any).authors || []
      return postAuthors.includes(author.name)
    })
    // newest first
    .sort(
      (a, b) =>
        new Date(b.date || b.publishedAt || 0).getTime() -
        new Date(a.date || a.publishedAt || 0).getTime()
    )

  return (
    <div className="py-8">
      {/* Author header */}
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="mb-4 h-28 w-28 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <Image
            src={author.avatar || '/static/images/avatar.png'}
            alt={author.name}
            width={112}
            height={112}
            className="h-full w-full object-cover"
          />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{author.name}</h1>
        {author.role && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{author.role}</p>
        )}
        {author.org && (
          <p className="text-xs text-gray-500 dark:text-gray-500">{author.org}</p>
        )}

        {/* Optional social row, only render what exists */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm">
          {author.email && (
            <Link href={author.email} className="text-primary-500 hover:underline">
              Email
            </Link>
          )}
          {author.github && (
            <Link href={author.github} className="text-primary-500 hover:underline">
              GitHub
            </Link>
          )}
          {author.linkedin && (
            <Link href={author.linkedin} className="text-primary-500 hover:underline">
              LinkedIn
            </Link>
          )}
        </div>
      </div>

      {/* Posts list */}
      {authorPosts.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400">
          No posts found for this author yet.
        </p>
      ) : (
        <div className="space-y-6">
          {authorPosts.map((post) => {
            const { path, title, summary, tags, date } = post as any
            return (
              <article
                key={path}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    <Link href={`/${path}`} className="hover:text-primary-500">
                      {title}
                    </Link>
                  </h2>
                  {date && (
                    <time
                      dateTime={date}
                      className="text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      {formatDate(date, siteMetadata.locale)}
                    </time>
                  )}
                </header>

                {tags && tags.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {tags.map((tag: string) => (
                      <Tag key={tag} text={tag} />
                    ))}
                  </div>
                )}

                {summary && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">{summary}</p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
