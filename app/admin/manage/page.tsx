'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type DraftRow = {
  slug: string
  title: string
  authors: string[]
  status: string
  createdAt: string
  updatedAt: string
  tags?: string[]
}

type PublishedRow = {
  slug: string
  title: string
  authors: string[]
  publishedAt: string
  updatedAt: string
  tags?: string[]
}

export default function AdminManagePage() {
  const [drafts, setDrafts] = useState<DraftRow[]>([])
  const [published, setPublished] = useState<PublishedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workingSlug, setWorkingSlug] = useState<string | null>(null)
  const router = useRouter()

  // --- filters & search ---
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')
  const [authorFilter, setAuthorFilter] = useState<'all' | string>('all')
  const [tagFilter, setTagFilter] = useState<'all' | string>('all')

  // ---- load posts (drafts + published) ----
  const loadPosts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const username = localStorage.getItem('admin_username')
      const password = localStorage.getItem('admin_password')

      if (!username || !password) {
        router.push('/admin/login')
        return
      }

      const res = await fetch('/api/admin/manage', {
        headers: {
          Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        },
        cache: 'no-store',
      })

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('admin_username')
          localStorage.removeItem('admin_password')
          router.push('/admin/login')
          return
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load posts')
      }

      const data = await res.json()
      setDrafts(data.drafts || [])
      setPublished(data.published || [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const username = localStorage.getItem('admin_username')
    const password = localStorage.getItem('admin_password')

    if (!username || !password) {
      router.push('/admin/login')
      return
    }

    loadPosts()
  }, [router, loadPosts])

  // ---- helpers ----
  const handleEdit = (slug: string) => {
    localStorage.setItem('ADMIN_EDITOR_LOAD', slug)
    router.push('/editor')
  }

  const handleDelete = async (slug: string, kind: 'draft' | 'published') => {
    if (
      !confirm(
        `Delete ${kind} "${slug}"?\n\nThis may remove it from drafts and/or published.\nThis cannot be undone.`
      )
    )
      return

    try {
      setWorkingSlug(slug)

      const username = localStorage.getItem('admin_username')
      const password = localStorage.getItem('admin_password')

      if (!username || !password) {
        router.push('/admin/login')
        return
      }

      // reuse your existing delete API
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        },
        body: JSON.stringify({ slug }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          localStorage.removeItem('admin_username')
          localStorage.removeItem('admin_password')
          router.push('/admin/login')
          return
        }
        throw new Error(data.error || 'Failed to delete')
      }

      // Remove from UI
      setDrafts((prev) => prev.filter((d) => d.slug !== slug))
      setPublished((prev) => prev.filter((p) => p.slug !== slug))
      alert('Post deleted')
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setWorkingSlug(null)
    }
  }

  const formatDate = (dateString: string) =>
    dateString
      ? new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : ''

  const handleLogout = () => {
    localStorage.removeItem('admin_username')
    localStorage.removeItem('admin_password')
    router.push('/admin/login')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  // ---- derive filter options ----
  const allStatuses = useMemo(() => {
    const s = new Set<string>()
    drafts.forEach((d) => d.status && s.add(d.status))
    if (published.length > 0) s.add('published')
    return Array.from(s)
  }, [drafts, published])

  const allAuthors = useMemo(() => {
    const s = new Set<string>()
    drafts.forEach((d) => d.authors?.forEach((a) => s.add(a)))
    published.forEach((p) => p.authors?.forEach((a) => s.add(a)))
    return Array.from(s)
  }, [drafts, published])

  const allTags = useMemo(() => {
    const s = new Set<string>()
    drafts.forEach((d) => d.tags?.forEach((t) => s.add(t)))
    published.forEach((p) => p.tags?.forEach((t) => s.add(t)))
    return Array.from(s)
  }, [drafts, published])

  // ---- apply search + filters ----
  const filteredDrafts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return drafts.filter((d) => {
      // search in title/slug
      if (q) {
        const inTitle = d.title?.toLowerCase().includes(q)
        const inSlug = d.slug?.toLowerCase().includes(q)
        if (!inTitle && !inSlug) return false
      }

      if (statusFilter !== 'all' && d.status !== statusFilter) return false

      if (authorFilter !== 'all') {
        if (!d.authors || !d.authors.includes(authorFilter)) return false
      }

      if (tagFilter !== 'all') {
        const tags = d.tags || []
        if (!tags.includes(tagFilter)) return false
      }

      return true
    })
  }, [drafts, searchQuery, statusFilter, authorFilter, tagFilter])

  const filteredPublished = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return published.filter((p) => {
      // search in title/slug
      if (q) {
        const inTitle = p.title?.toLowerCase().includes(q)
        const inSlug = p.slug?.toLowerCase().includes(q)
        if (!inTitle && !inSlug) return false
      }

      if (statusFilter !== 'all' && statusFilter !== 'published') return false

      if (authorFilter !== 'all') {
        if (!p.authors || !p.authors.includes(authorFilter)) return false
      }

      if (tagFilter !== 'all') {
        const tags = p.tags || []
        if (!tags.includes(tagFilter)) return false
      }

      return true
    })
  }, [published, searchQuery, statusFilter, authorFilter, tagFilter])

  // ---- UI ----
  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading posts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <p className="mb-4 text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadPosts}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Manage Posts</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              View and manage all drafts, queued, rejected and published posts.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin')}
              className="rounded bg-gray-200 px-4 py-2 text-sm text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              ← Back to Review Queue
            </button>
            <button
              onClick={handleLogout}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 rounded-lg bg-white p-4 shadow dark:border dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-3 md:grid-cols-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by title or slug…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="all">All</option>
                {allStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Author */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Author
              </label>
              <select
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="all">All</option>
                {allAuthors.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tag + Clear */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="w-full max-w-xs">
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Tag
              </label>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="all">All</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setAuthorFilter('all')
                setTagFilter('all')
              }}
              className="mt-5 rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* Drafts / Queue */}
        <section className="mb-8 rounded-lg bg-white p-5 shadow dark:border dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Drafts & Review Queue
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredDrafts.length} item{filteredDrafts.length === 1 ? '' : 's'}
            </span>
          </div>

          {filteredDrafts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No drafts or queued posts match filters.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredDrafts.map((d) => (
                <div
                  key={d.slug}
                  className="flex flex-col gap-2 rounded border border-gray-200 p-3 md:flex-row md:items-center md:justify-between dark:border-gray-700"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {d.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs capitalize ${getStatusColor(d.status)}`}
                      >
                        {d.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
                        /{d.slug}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {d.authors.length > 0 && <>By {d.authors.join(', ')} · </>}
                      {formatDate(d.updatedAt || d.createdAt)}
                    </div>
                    {d.tags && d.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {d.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(d.slug)}
                      className="rounded bg-yellow-500 px-3 py-1 text-sm font-semibold text-white hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={workingSlug === d.slug}
                      onClick={() => handleDelete(d.slug, 'draft')}
                      className="rounded bg-gray-700 px-3 py-1 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                    >
                      {workingSlug === d.slug ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Published */}
        <section className="rounded-lg bg-white p-5 shadow dark:border dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Published Posts
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredPublished.length} post{filteredPublished.length === 1 ? '' : 's'}
            </span>
          </div>

          {filteredPublished.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No published posts match filters.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredPublished.map((p) => (
                <div
                  key={p.slug}
                  className="flex flex-col gap-2 rounded border border-gray-200 p-3 md:flex-row md:items-center md:justify-between dark:border-gray-700"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {p.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor('published')}`}
                      >
                        published
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
                        /{p.slug}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {p.authors.length > 0 && <>By {p.authors.join(', ')} · </>}
                      {p.publishedAt && formatDate(p.publishedAt)}
                    </div>
                    {p.tags && p.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => (window.location.href = `/blog/${p.slug}`)}
                      className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(p.slug)}
                      className="rounded bg-yellow-500 px-3 py-1 text-sm font-semibold text-white hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={workingSlug === p.slug}
                      onClick={() => handleDelete(p.slug, 'published')}
                      className="rounded bg-gray-700 px-3 py-1 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                    >
                      {workingSlug === p.slug ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
