'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const router = useRouter()

  // fetchDrafts wrapped in useCallback so it can safely be used in useEffect deps
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
          // Clear invalid credentials and redirect to login
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
        // Remove the reviewed draft from list
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

  // --- Preview (returns full post meta + html) ---
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

  // --- Edit from preview modal (keep this) ---
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
        return 'bg-blue-100 text-blue-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending_review':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Only show pending_review posts on this dashboard
  const pendingDrafts = drafts.filter((d) => d.status === 'pending_review')

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600">Loading drafts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="mb-4 text-red-600">{error}</p>
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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Review and approve draft posts ({pendingDrafts.length} pending)
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        {pendingDrafts.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl text-gray-400">📝</div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">No drafts to review</h3>
            <p className="text-gray-600">
              All posts have been reviewed or there are no pending drafts.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingDrafts.map((draft) => (
              <div key={draft.slug} className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center space-x-3">
                      <h3 className="text-xl font-semibold text-gray-900">{draft.title}</h3>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(draft.status)}`}
                      >
                        {draft.status}
                      </span>
                      {draft.isConflict && (
                        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                          Conflict
                        </span>
                      )}
                    </div>

                    <p className="mb-2 text-sm text-gray-600">
                      By {draft.authors.join(', ')} • Created {formatDate(draft.createdAt)}
                    </p>

                    <p className="mb-4 text-gray-700">{draft.excerpt}</p>

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

                      <input
                        type="text"
                        placeholder="Rejection feedback (optional)"
                        value={feedback[draft.slug] || ''}
                        onChange={(e) =>
                          setFeedback((prev) => ({ ...prev, [draft.slug]: e.target.value }))
                        }
                        className="ml-2 min-w-[180px] flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview modal – still lets you "Edit in Editor" */}
      {previewPost && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs tracking-wide text-gray-500 uppercase">
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
              className="prose prose-slate dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: previewPost.html }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
