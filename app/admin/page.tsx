'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface Draft {
  slug: string
  title: string
  authors: string[]
  status: string
  createdAt: string
  updatedAt: string
  isConflict: boolean
  excerpt: string
  feedback?: string
}

interface PreviewPost {
  slug: string
  title: string
  date: string
  summary: string
  tags: string[]
  authors: string[]
  html: string
}

export default function AdminDashboard() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ [key: string]: string }>({})
  const [previewPost, setPreviewPost] = useState<PreviewPost | null>(null)
  const [previewLoadingSlug, setPreviewLoadingSlug] = useState<string | null>(null)
  const [previewSlug, setPreviewSlug] = useState<string | null>(null)

  // sort & filter
  const [sortKey, setSortKey] = useState<'created' | 'updated'>('created')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [authorFilter, setAuthorFilter] = useState<string>('all')
  const [search, setSearch] = useState<string>('')

  const router = useRouter()

  const fetchDrafts = useCallback(async () => {
    try {
      setLoading(true)
      const username = localStorage.getItem('admin_username')
      const password = localStorage.getItem('admin_password')

      if (!username || !password) {
        router.push('/admin/login')
        return
      }

      const response = await fetch('/api/admin/drafts', {
        headers: {
          Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin_username')
          localStorage.removeItem('admin_password')
          router.push('/admin/login')
          return
        }
        throw new Error('Failed to fetch drafts')
      }

      const data = await response.json()
      setDrafts(data.drafts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch drafts')
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

    fetchDrafts()
  }, [router, fetchDrafts])

  const handleAction = async (slug: string, action: 'approve' | 'reject') => {
    try {
      setProcessing(slug)

      const username = localStorage.getItem('admin_username')
      const password = localStorage.getItem('admin_password')

      if (!username || !password) {
        router.push('/admin/login')
        return
      }

      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        },
        body: JSON.stringify({
          slug,
          action,
          feedback: feedback[slug] || '',
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin_username')
          localStorage.removeItem('admin_password')
          router.push('/admin/login')
          return
        }
        throw new Error('Failed to process action')
      }

      const result = await response.json()

      if (result.success) {
        setDrafts((prev) => prev.filter((d) => d.slug !== slug))
        setFeedback((prev) => {
          const newFeedback = { ...prev }
          delete newFeedback[slug]
          return newFeedback
        })
        alert(action === 'approve' ? 'Post approved and published!' : 'Post rejected!')
      } else {
        throw new Error(result?.error || 'Unknown server error')
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to process action'}`)
    } finally {
      setProcessing(null)
    }
  }

  // Preview
  const handlePreview = async (slug: string) => {
    setPreviewPost(null)
    setPreviewSlug(slug)
    setPreviewLoadingSlug(slug)

    try {
      const username = localStorage.getItem('admin_username')
      const password = localStorage.getItem('admin_password')

      if (!username || !password) {
        router.push('/admin/login')
        return
      }

      const res = await fetch(`/api/admin/preview?slug=${encodeURIComponent(slug)}`, {
        headers: {
          Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        },
      })

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('admin_username')
          localStorage.removeItem('admin_password')
          router.push('/admin/login')
          return
        }
        throw new Error('Failed to load preview')
      }

      const data = await res.json()
      if (data && data.success && data.post) {
        setPreviewPost(data.post as PreviewPost)
      } else {
        throw new Error(data?.error || 'No preview available')
      }
    } catch (err) {
      alert(`Preview error: ${err instanceof Error ? err.message : 'Unknown'}`)
    } finally {
      setPreviewLoadingSlug(null)
    }
  }

  const handleEdit = (slug: string) => {
    localStorage.setItem('ADMIN_EDITOR_LOAD', slug)
    router.push(`/editor`)
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_username')
    localStorage.removeItem('admin_password')
    router.push('/admin/login')
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const formatDateShort = (dateString: string) =>
    dateString
      ? new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : ''

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    }
  }

  const distinctAuthors = useMemo(() => {
    const set = new Set<string>()
    drafts.forEach((d) => d.authors.forEach((a) => set.add(a)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [drafts])

  const visibleDrafts = useMemo(() => {
    let list = [...drafts]

    if (authorFilter !== 'all') {
      list = list.filter((d) => d.authors.includes(authorFilter))
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((d) => {
        const inTitle = d.title.toLowerCase().includes(q)
        const inAuthors = d.authors.join(', ').toLowerCase().includes(q)
        return inTitle || inAuthors
      })
    }

    list.sort((a, b) => {
      const aDate = new Date(sortKey === 'created' ? a.createdAt : a.updatedAt).getTime()
      const bDate = new Date(sortKey === 'created' ? b.createdAt : b.updatedAt).getTime()
      if (aDate === bDate) return 0
      if (sortDir === 'desc') return bDate - aDate
      return aDate - bDate
    })

    return list
  }, [drafts, authorFilter, search, sortKey, sortDir])

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading drafts...</p>
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
            onClick={fetchDrafts}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gray-50 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Review and approve draft posts ({drafts.length} pending)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/manage')}
              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              Manage Posts
            </button>
            <button
              onClick={handleLogout}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Filter + sort */}
        {drafts.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-3 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-900 dark:shadow-none">
            <div className="flex flex-col text-sm">
              <span className="mb-1 font-medium text-gray-700 dark:text-gray-200">Sort by</span>
              <div className="flex gap-2">
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as 'created' | 'updated')}
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="created">Created date</option>
                  <option value="updated">Last updated</option>
                </select>
                <select
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col text-sm">
              <span className="mb-1 font-medium text-gray-700 dark:text-gray-200">
                Filter by author
              </span>
              <select
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                className="min-w-[160px] rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="all">All authors</option>
                {distinctAuthors.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-1 flex-col text-sm">
              <span className="mb-1 font-medium text-gray-700 dark:text-gray-200">Search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or author…"
                className="w-full rounded border border-gray-300 px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>
        )}

        {/* List */}
        {visibleDrafts.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl text-gray-400">📝</div>
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
              No drafts to review
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              All posts have been reviewed or there are no pending drafts.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {visibleDrafts.map((draft) => (
              <div
                key={draft.slug}
                className="rounded-lg bg-white p-6 shadow dark:bg-gray-900 dark:shadow-none"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {draft.title}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                          draft.status
                        )}`}
                      >
                        {draft.status}
                      </span>
                      {draft.isConflict && (
                        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
                          Conflict
                        </span>
                      )}
                    </div>

                    <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">
                      By {draft.authors.join(', ')} • Created {formatDate(draft.createdAt)}
                    </p>
                    <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
                      Last updated {formatDate(draft.updatedAt)}
                    </p>

                    <p className="mb-4 text-gray-700 dark:text-gray-200">{draft.excerpt}</p>

                    {draft.status === 'rejected' && (
                      <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 dark:border-red-800/60 dark:bg-red-900/20">
                        <p className="text-sm text-red-800 dark:text-red-200">
                          <strong>Rejected:</strong> {draft.feedback || 'No feedback provided'}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleAction(draft.slug, 'approve')}
                        disabled={processing === draft.slug}
                        className="rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {processing === draft.slug ? 'Processing...' : 'Approve'}
                      </button>

                      <button
                        onClick={() => handleAction(draft.slug, 'reject')}
                        disabled={processing === draft.slug}
                        className="rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {processing === draft.slug ? 'Processing...' : 'Reject'}
                      </button>

                      <button
                        onClick={() => handlePreview(draft.slug)}
                        disabled={previewLoadingSlug !== null}
                        className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                      >
                        {previewLoadingSlug === draft.slug ? 'Loading...' : 'Preview'}
                      </button>

                      <button
                        onClick={() => handleEdit(draft.slug)}
                        className="rounded bg-yellow-500 px-3 py-2 text-sm text-white hover:bg-yellow-600"
                      >
                        Edit
                      </button>

                      <input
                        type="text"
                        placeholder="Rejection feedback (optional)"
                        value={feedback[draft.slug] || ''}
                        onChange={(e) =>
                          setFeedback((prev) => ({ ...prev, [draft.slug]: e.target.value }))
                        }
                        className="ml-2 min-w-[180px] flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewPost && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Previewing draft: <span className="font-mono">{previewPost.slug}</span>
                </p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {previewPost.title}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  {previewPost.authors.length > 0 && (
                    <span>By {previewPost.authors.join(', ')}</span>
                  )}
                  {previewPost.date && (
                    <>
                      <span>•</span>
                      <span>{formatDateShort(previewPost.date)}</span>
                    </>
                  )}
                </div>
                {previewPost.tags && previewPost.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {previewPost.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (previewPost.slug) handleEdit(previewPost.slug)
                  }}
                  className="rounded bg-yellow-500 px-3 py-1 text-sm text-white hover:bg-yellow-600"
                >
                  Edit in Editor
                </button>
                <button
                  onClick={() => {
                    setPreviewPost(null)
                    setPreviewSlug(null)
                  }}
                  className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>

            {previewPost.summary && (
              <p className="mb-4 text-sm text-gray-600 italic dark:text-gray-300">
                {previewPost.summary}
              </p>
            )}

            <hr className="mb-4 border-gray-200 dark:border-gray-700" />

            <article
              className="prose prose-slate max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: previewPost.html }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
