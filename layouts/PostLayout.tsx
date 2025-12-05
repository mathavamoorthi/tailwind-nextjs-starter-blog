import { ReactNode } from 'react'
import { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog, Author } from 'contentlayer/generated'
import Link from '@/components/Link'
import PageTitle from '@/components/PageTitle'
import Image from '@/components/Image'
import Tag from '@/components/Tag'
import siteMetadata from '@/data/siteMetadata'
import NovaTOC from '@/components/NovaTOC'

const postDateTemplate: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}

interface LayoutProps {
  content: CoreContent<Blog>
  authorDetails: CoreContent<Author>[]
  next?: { path: string; title: string }
  prev?: { path: string; title: string }
  toc?: any
  children: ReactNode
}

export default function PostLayout({
  content,
  authorDetails,
  next,
  prev,
  toc,
  children,
}: LayoutProps) {
  const { date, title, tags } = content

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <article>
        <div className="xl:divide-y xl:divide-gray-200 xl:dark:divide-gray-700">
          {/* Header with Title */}
          <header className="pt-6 xl:pb-6">
            <div className="space-y-4">
              <div className="text-center">
                <PageTitle>{title}</PageTitle>
              </div>

              {/* Top Metadata Bar - Professional & Organized */}
              <div className="flex flex-wrap items-center justify-center gap-4 py-4 border-y border-gray-200 dark:border-gray-700">
                {/* Author Info */}
                <div className="flex items-center gap-3">
                  {authorDetails.map((author) => (
                    <div key={author.name} className="flex items-center gap-3">
                      {author.avatar && (
                        <Image
                          src={author.avatar}
                          width={40}
                          height={40}
                          alt={author.name}
                          className="h-10 w-10 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
                        />
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {author.name}
                        </span>
                        {author.twitter && (
                          <Link
                            href={author.twitter}
                            className="text-xs text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                          >
                            {author.twitter
                              .replace('https://twitter.com/', '@')
                              .replace('https://x.com/', '@')}
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />

                {/* Date */}
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-gray-500 dark:text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <time
                    dateTime={date}
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {new Date(date).toLocaleDateString(siteMetadata.locale, postDateTemplate)}
                  </time>
                </div>

                {/* Tags */}
                {tags && tags.length > 0 && (
                  <>
                    <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
                    <div className="flex flex-wrap items-center gap-2">
                      <svg
                        className="h-4 w-4 text-gray-500 dark:text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      {tags.map((tag) => (
                        <Tag key={tag} text={tag} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Content Layout: Main content + TOC sidebar */}
          <div className="grid-rows-[auto_1fr] pb-8 xl:grid xl:grid-cols-12 xl:gap-x-8">
            {/* MAIN CONTENT - Takes most of the space */}
            <div className="xl:col-span-9 xl:row-span-2">
              <div className="prose dark:prose-invert max-w-none pt-10 pb-8">{children}</div>

              {/* Next/Previous Navigation */}
              {(next || prev) && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-8 pb-4">
                  <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    Read next
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {prev && prev.path && (
                      <Link
                        href={`/${prev.path}`}
                        className="block rounded-xl border border-gray-200 p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
                      >
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                          ← Previous article
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {prev.title}
                        </p>
                      </Link>
                    )}
                    {next && next.path && (
                      <Link
                        href={`/${next.path}`}
                        className="block rounded-xl border border-gray-200 p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
                      >
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                          Next article →
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {next.title}
                        </p>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT SIDEBAR: Table of Contents */}
            {toc?.length > 0 && (
              <aside className="hidden xl:block xl:col-span-3 xl:row-span-2 xl:pt-10">
                <div className="sticky top-24">
                  <NovaTOC toc={toc} />
                </div>
              </aside>
            )}
          </div>
        </div>
      </article>
    </div>
  )
}
