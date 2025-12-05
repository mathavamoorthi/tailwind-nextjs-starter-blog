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
    // ⬇️ Dedicated wide container for blog posts
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <article>
        <div className="xl:divide-y xl:divide-gray-200 xl:dark:divide-gray-700">
          {/* Header */}
          <header className="pt-6 xl:pb-6">
            <div className="space-y-1 text-center">
              <dl className="space-y-10">
                <div>
                  <dt className="sr-only">Published on</dt>
                  <dd className="text-base leading-6 font-medium text-gray-500 dark:text-gray-400">
                    <time dateTime={date}>
                      {new Date(date).toLocaleDateString(siteMetadata.locale, postDateTemplate)}
                    </time>
                  </dd>
                </div>
              </dl>
              <div>
                <PageTitle>{title}</PageTitle>
              </div>
            </div>
          </header>

          {/* Layout grid: narrower col1 author+tags | wider col2-3 content | col4 TOC */}
          <div className="grid-rows-[auto_1fr] divide-y divide-gray-200 pb-8 xl:grid xl:grid-cols-12 xl:gap-x-6 xl:divide-y-0 dark:divide-gray-700">
            {/* LEFT SIDEBAR: Author + Tags - Now takes 2 columns instead of 3 */}
            <div className="pt-6 pb-10 xl:pt-11 xl:col-span-2">
              <div className="sticky top-24 space-y-6">
                {/* Author card */}
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3 text-sm dark:border-gray-700 dark:bg-gray-900/40">
                  <h2 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                    Author
                  </h2>
                  <ul className="space-y-4">
                    {authorDetails.map((author) => (
                      <li className="flex items-center space-x-3" key={author.name}>
                        {author.avatar && (
                          <Image
                            src={author.avatar}
                            width={36}
                            height={36}
                            alt={author.name}
                            className="h-9 w-9 rounded-full"
                          />
                        )}
                        <div className="text-sm leading-5 font-medium">
                          <p className="text-gray-900 dark:text-gray-100">{author.name}</p>
                          {author.twitter && (
                            <Link
                              href={author.twitter}
                              className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 text-xs"
                            >
                              {author.twitter
                                .replace('https://twitter.com/', '@')
                                .replace('https://x.com/', '@')}
                            </Link>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tags card */}
                {tags && tags.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3 text-sm dark:border-gray-700 dark:bg-gray-900/40">
                    <h2 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                      Tags
                    </h2>
                    <div className="flex flex-col space-y-1">
                      {tags.map((tag) => (
                        <Tag key={tag} text={tag} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MAIN CONTENT – center - Now takes 7 columns instead of 6 */}
            <div className="divide-y divide-gray-200 xl:col-span-7 xl:row-span-2 xl:pb-0 dark:divide-gray-700">
              <div className="prose dark:prose-invert max-w-none pt-10 pb-8">{children}</div>

              {(next || prev) && (
                <div className="pt-8 pb-4">
                  <h2 className="text-lg font-semibold mb-4">Read next</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {prev && prev.path && (
                      <Link
                        href={`/${prev.path}`}
                        className="block rounded-xl border border-gray-200 p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition"
                      >
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Previous article
                        </p>
                          <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                          {prev.title}
                        </p>
                      </Link>
                    )}
                    {next && next.path && (
                      <Link
                        href={`/${next.path}`}
                        className="block rounded-xl border border-gray-200 p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition"
                      >
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Next article
                        </p>
                        <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                          {next.title}
                        </p>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT SIDEBAR: TOC – sticky - Takes 3 columns */}
            {toc?.length > 0 && (
              <aside className="hidden xl:block xl:pt-11 xl:col-span-3 xl:row-span-2">
                <div className="sticky top-24">
                  <NovaTOC toc={toc} />
                </div>
              </aside>
            )}

            {/* Footer filler */}
            <footer className="hidden xl:block xl:col-span-12" aria-hidden="true" />
          </div>
        </div>
      </article>
    </div>
  )
}
