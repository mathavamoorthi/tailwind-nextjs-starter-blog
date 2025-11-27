// app/authors/page.tsx
import Link from '@/components/Link'
import Image from '@/components/Image'
import { authors } from '@/data/authors'

export const metadata = {
  title: 'Authors',
  description: 'Meet the people writing on NovaBlog.',
}

export default function AuthorsPage() {
  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-slate-50 via-white to-slate-100 py-10 dark:from-[#020617] dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
            Authors
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Meet the people writing on <span className="font-semibold">NovaBlog</span>.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {authors.map((author) => (
            <Link
              key={author.slug}
              href={`/authors/${author.slug}`}
              className="group flex flex-col items-center justify-between rounded-3xl border border-slate-200 bg-white/80 px-5 py-6 text-center shadow-sm ring-0 transition-all duration-200 hover:-translate-y-1 hover:border-primary-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-slate-800 dark:bg-slate-900/70"
            >
              {/* Avatar */}
              <div className="mb-4 flex justify-center">
                <div className="relative">
                  <div className="h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-md transition-all duration-200 group-hover:border-primary-400 group-hover:shadow-primary-300/40 dark:border-slate-700 dark:bg-slate-800 dark:group-hover:border-primary-500 dark:group-hover:shadow-primary-900/60">
                    {author.avatar ? (
                      <Image
                        src={author.avatar}
                        alt={author.name}
                        width={96}
                        height={96}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-500">
                        {author.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Glow ring on hover */}
                  <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-primary-400/0 via-primary-400/0 to-primary-400/0 blur-md transition-opacity duration-200 group-hover:opacity-60 dark:from-primary-500/0 dark:via-primary-500/0 dark:to-primary-500/0" />
                </div>
              </div>

              {/* Name + role */}
              <div className="space-y-1">
                <div className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  {author.name}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {author.role ?? 'Nova Team Member'}
                </div>
              </div>

              {/* Bottom pill */}
              <div className="mt-4 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 transition-colors group-hover:bg-primary-50 group-hover:text-primary-500 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-primary-900/40 dark:group-hover:text-primary-300">
                View posts →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
