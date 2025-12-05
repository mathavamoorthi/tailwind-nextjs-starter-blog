import { ReactNode, useEffect, useState } from 'react'
import { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog, Author } from 'contentlayer/generated'
import Link from '@/components/Link'
import PageTitle from '@/components/PageTitle'
import SectionContainer from '@/components/SectionContainer'
import Image from '@/components/Image'
import Tag from '@/components/Tag'
import siteMetadata from '@/data/siteMetadata'

const postDateTemplate: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}

interface TocItem {
  value: string
  url: string
  depth: number
}

interface LayoutProps {
  content: CoreContent<Blog>
  authorDetails: CoreContent<Author>[]
  next?: { path: string; title: string }
  prev?: { path: string; title: string }
  toc?: TocItem[]
  children: ReactNode
}

/**
 * Sticky scroll-spy TOC on the right
 */
function NovaTOC({ toc }: { toc: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (!toc || toc.length === 0) return

    const headingIds = toc
      .map((item) => item.url.replace('#', ''))
      .filter((id) => !!id)
    const elements = headingIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        // Trigger earlier so it feels natural
        rootMargin: '0px 0px -60% 0px',
        threshold: 0.1,
      }
    )

    elements.forEach((el) => observer.observe(el))

    return () => {
      elements.forEach((el) => observer.unobserve(el))
      observer.disconnect()
    }
  }, [toc])

  return (
    <div className="sticky top-24 rounded-xl border border-gray-200 bg-gray-50/70 p-4 text-sm dark:border-gray-700 dark:bg-gray-900/40">
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        Contents
      </h2>
      <ul className="space-y-1">
        {toc.map((item) => {
          const id = item.url.replace('#', '')
          const isActive = activeId === id

          const indent =
            item.depth > 2 ? 'pl-4 text-xs' : 'text-sm'
          const weight = item.depth === 2 ? 'font-semibold' : ''
          const color = isActive
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-gray-700 dark:text-gray-300'

          return (
            <li key={item.url}>
              <a
                href={item.url}
                className={`${indent} ${weight} ${color} block transition-colors`}
              >
                {item.value}
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function PostLayout({
  content,
  authorDetails,
  next,
  prev,
  toc = [],
  children,
}: LayoutProps) {
  const { path, date, title, tags } = content
  const basePath = path.split('/')[0]

  return (
    <SectionContainer>
      <article>
        <div className="xl:divide-y xl:divide-gray-200 xl:dark:divide-gray-700">
          <header className="pt-6 xl:pb-6">
            <div className="space-y-1 text-center">
              <dl className="space-y-10">
                <div>
                  <dt className="sr-only">Published on</dt>
                  <dd className="text-base leading-6 font-medium text-gray-500 dark:text-gray-400">
                    <time dateTime={date}>
                      {new Date(date).toLocaleDateString(
                        siteMetadata.locale,
                        postDateTemplate
                      )}
                    </time>
                  </dd>
                </div>
              </dl>
              <div>
                <PageTitle>{title}</PageTitle>
              </div>
            </div>
          </header>

          {/* Grid: col1 author, col2-3 content, col4 TOC */}
          <div className="grid-rows-[auto_1fr] divide-y divide-gray-200 pb-8 xl:grid xl:grid-cols-4 xl:gap-x-6 xl:divide-y-0 dark:divide-gray-700">
            {/* Author sidebar (left) */}
            <dl className="pt-6 pb-10 xl:border-b xl:border-gray-200 xl:pt-11 xl:dark:border-gray-700">
              <dt className="sr-only">Author</dt>
              <dd>
                <ul className="flex flex-wrap justify-center gap-4 sm:space-x-12 xl:block xl:space-y-8 xl:space-x-0">
                  {authorDetails.map((author) => (
                    <li className="flex items-center space-x-2" key={author.name}>
                      {author.avatar && (
                        <Image
                          src={author.avatar}
                          width={38}
                          height={38}
                          alt="avatar"
                          className="h-10 w-10 rounded-full"
                        />
                      )}
                      <dl className="text-sm leading-5 font-medium whitespace-nowrap">
                        <dt className="sr-only">Name</dt>
                        <dd className="text-gray-900 dark:text-gray-100">{author.name}</dd>
                        <dt className="sr-only">Twitter</dt>
                        <dd>
                          {author.twitter && (
                            <Link
                              href={author.twitter}
                              className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                            >
                              {author.twitter
                                .replace('https://twitter.com/', '@')
                                .replace('https://x.com/', '@')}
                            </Link>
                          )}
                        </dd>
                      </dl>
                    </li>
                  ))}
                </ul>
              </dd>
            </dl>

            {/* Main content (center, spans col 2–3) */}
            <div className="divide-y divide-gray-200 xl:col-span-2 xl:col-start-2 xl:row-span-2 xl:pb-0 dark:divide-gray-700">
              <div className="prose dark:prose-invert max-w-none pt-10 pb-8">
                {children}
              </div>

              {/* Read next section */}
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

            {/* TOC (right, sticky, desktop only, scroll-spy) */}
            {toc.length > 0 && (
              <aside className="hidden xl:block xl:pt-11 xl:col-start-4 xl:row-span-2">
                <NovaTOC toc={toc} />
              </aside>
            )}

            {/* Footer: tags (left bottom) + back link */}
            <footer>
              <div className="divide-gray-200 text-sm leading-5 font-medium xl:col-start-1 xl:row-start-2 xl:divide-y dark:divide-gray-700">
                {tags && (
                  <div className="py-4 xl:py-8">
                    <h2 className="text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400">
                      Tags
                    </h2>
                    <div className="flex flex-wrap">
                      {tags.map((tag) => (
                        <Tag key={tag} text={tag} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 xl:pt-8">
                <Link
                  href={`/${basePath}`}
                  className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                  aria-label="Back to the blog"
                >
                  &larr; Back to the blog
                </Link>
              </div>
            </footer>
          </div>
        </div>
      </article>
    </SectionContainer>
  )
}
