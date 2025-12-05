'use client'

import { useEffect, useState } from 'react'

interface TocItem {
  value: string
  url: string
  depth: number
}

export default function NovaTOC({ toc }: { toc: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (!toc || toc.length === 0) return

    const ids = toc
      .map((item) => item.url.replace('#', ''))
      .filter(Boolean)

    const elements = ids
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
    <div className="sticky top-24 rounded-2xl border border-gray-200 bg-gray-50/80 p-4 text-sm dark:border-gray-700 dark:bg-gray-900/40">
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        Contents
      </h2>
      <ul className="space-y-0.5">
        {toc.map((item) => {
          const id = item.url.replace('#', '')
          const isActive = activeId === id

          const indent =
            item.depth > 2 ? 'pl-4 text-xs' : 'text-sm'
          const weight = item.depth === 2 ? 'font-semibold' : ''

          const color = isActive
            ? 'text-primary-600 dark:text-primary-400' // active: pink
            : 'text-gray-700 dark:text-gray-300'       // normal: visible in light + dark

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
