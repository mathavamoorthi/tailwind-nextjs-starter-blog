'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type DraftRow = {
  slug: string
  title: string
  authors: string[]
  status: string
  createdAt: string
  updatedAt: string
}

type PublishedRow = {
  slug: string
  title: string
  authors: string[]
  publishedAt: string
  updatedAt: string
}

export default function AdminManagePage() {
  const [drafts, setDrafts] = useState<DraftRow[]>([])
  const [published, setPublished] = useState<PublishedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workingSlug, setWorkingSlug] = useState<string | null>(null)
  const router = useRouter()

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
    if (!confirm(`Delete ${kind} "${slug}"? This cannot be undone.`)) return

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

  // ---- UI ----
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600">Loading posts...</p>
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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Posts</h1>
            <p className="mt-2 text-gray-600">
              View and manage all drafts, queued, rejected and published posts.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        {/* Drafts / Queue */}
        <section className="mb-8 rounded-lg bg-white p-5 shadow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Drafts & Review Queue</h2>
            <span className="text-xs text-gray-500">
              {drafts.length} item{drafts.length === 1 ? '' : 's'}
            </span>
          </div>

          {drafts.length === 0 ? (
            <p className="text-sm text-gray-500">No drafts or queued posts.</p>
          ) : (
            <div className="space-y-3">
              {drafts.map((d) => (
                <div
                  key={d.slug}
                  className="flex flex-col gap-2 rounded border border-gray-200 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{d.title}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-700">
                        {d.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {d.authors.length > 0 && <>By {d.authors.join(', ')} · </>}
                      {formatDate(d.updatedAt || d.createdAt)}
                    </div>
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
        <section className="rounded-lg bg-white p-5 shadow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Published Posts</h2>
            <span className="text-xs text-gray-500">
              {published.length} post{published.length === 1 ? '' : 's'}
            </span>
          </div>

          {published.length === 0 ? (
            <p className="text-sm text-gray-500">No published posts yet.</p>
          ) : (
            <div className="space-y-3">
              {published.map((p) => (
                <div
                  key={p.slug}
                  className="flex flex-col gap-2 rounded border border-gray-200 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{p.title}</span>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                        published
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {p.authors.length > 0 && <>By {p.authors.join(', ')} · </>}
                      {p.publishedAt && formatDate(p.publishedAt)}
                    </div>
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
