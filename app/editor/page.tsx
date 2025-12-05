'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

type Frontmatter = {
  title: string
  date: string
  tags: string
  lastmod: string
  draft: boolean
  summary: string
  images: string
  authors: string
  layout: string
  bibliography: string
  canonicalUrl: string
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function MDXEditorPage() {
  const [frontmatter, setFrontmatter] = useState<Frontmatter>({
    title: '',
    date: new Date().toISOString().slice(0, 10),
    tags: '',
    lastmod: '',
    draft: false,
    summary: '',
    images: '',
    authors: '',
    layout: '',
    bibliography: '',
    canonicalUrl: '',
  })
  const [body, setBody] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)
  const [autoSaving, setAutoSaving] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [dirty, setDirty] = useState<boolean>(false)
  const [loadingExisting, setLoadingExisting] = useState<boolean>(false)
  const [existingPosts, setExistingPosts] = useState<{ title: string; slug: string }[]>([])
  const [draftPosts, setDraftPosts] = useState<{ title: string; slug: string; status: string }[]>([])
  const [githubStatus, setGitHubStatus] = useState<{
    configured: boolean
    owner: string | null
    repo: string | null
  } | null>(null)

  // NEW: track status + rejection feedback from frontmatter
  const [status, setStatus] = useState<string | null>(null)
  const [rejectionFeedback, setRejectionFeedback] = useState<string | null>(null)

  const slug = useMemo(() => slugify(frontmatter.title || 'untitled'), [frontmatter.title])

  const handleChange = (key: keyof Frontmatter, value: string | boolean) => {
    setFrontmatter((prev) => ({ ...prev, [key]: value }))
  }

  // Generic save function that supports both draft + submit (+ autosave)
  const savePost = useCallback(
    async (mode: 'draft' | 'submit', options?: { autosave?: boolean }) => {
      const autosave = options?.autosave === true

      // For autosave, don't start if something else is in-flight
      if (autosave && (saving || autoSaving)) return

      if (autosave) {
        setAutoSaving(true)
      } else {
        setSaving(true)
        setMessage('')
      }

      try {
        const res = await fetch('/api/editor/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frontmatter, body, slug, mode }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || 'Failed to save')
        }
        const data = await res.json()

        // Update local status based on action
        if (mode === 'submit') {
          setStatus('pending_review')
          setRejectionFeedback(null) // feedback handled
        } else {
          setStatus('draft')
        }

        setDirty(false)

        if (autosave) {
          setLastAutoSave(
            new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          )
        } else {
          if (typeof data.message === 'string' && data.message.length > 0) {
            setMessage(`✅ ${data.message}`)
          } else {
            if (mode === 'submit') {
              setMessage(`✅ Submitted for review: ${data.path}`)
            } else {
              setMessage(`✅ Draft saved: ${data.path}`)
            }
          }
        }
      } catch (err) {
        const error = err as Error
        if (autosave) {
          // don't spam, only show if there was no message
          setMessage((prev) => prev || error.message)
        } else {
          setMessage(error.message)
        }
      } finally {
        if (autosave) setAutoSaving(false)
        else setSaving(false)
      }
    },
    [frontmatter, body, slug, saving, autoSaving]
  )

  // Form submit = "Save draft"
  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    await savePost('draft')
  }

  // Secondary button click = "Submit for review" (also used after rejection)
  const handleSubmitForReview = async () => {
    await savePost('submit')
  }

  useEffect(() => {
    setDirty(true)
  }, [frontmatter, body])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  useEffect(() => {
    let canceled = false
    async function render() {
      try {
        const md = body
        const file = await unified()
          .use(remarkParse)
          .use(remarkGfm)
          .use(remarkRehype)
          .use(rehypeStringify)
          .process(md)
        if (!canceled) setPreviewHtml(String(file))
      } catch {
        if (!canceled) setPreviewHtml('')
      }
    }
    render()
    return () => {
      canceled = true
    }
  }, [body])

  // Load existing posts for quick editing (published/approved blog posts)
  useEffect(() => {
    let cancelled = false
    async function fetchPosts() {
      try {
        setLoadingExisting(true)
        const res = await fetch('/api/editor/list')
        if (!res.ok) return
        const data = (await res.json()) as { posts: { title: string; slug: string }[] }
        if (!cancelled) setExistingPosts(data.posts || [])
      } finally {
        setLoadingExisting(false)
      }
    }
    fetchPosts()
    return () => {
      cancelled = true
    }
  }, [])

  // Load drafts for this editor
  useEffect(() => {
    let cancelled = false
    async function fetchDrafts() {
      try {
        const res = await fetch('/api/editor/drafts')
        if (!res.ok) return
        const data = (await res.json()) as {
          posts: { title: string; slug: string; status: string }[]
        }
        if (!cancelled) setDraftPosts(data.posts || [])
      } catch (e) {
        console.error('Failed to load drafts', e)
      }
    }
    fetchDrafts()
    return () => {
      cancelled = true
    }
  }, [])

  // Check GitHub configuration status
  useEffect(() => {
    let cancelled = false
    async function checkGitHubStatus() {
      try {
        const res = await fetch('/api/editor/github-status')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setGitHubStatus(data)
      } catch (error) {
        console.error('Failed to check GitHub status:', error)
      }
    }
    checkGitHubStatus()
    return () => {
      cancelled = true
    }
  }, [])

  async function loadPost(editSlug: string) {
    const res = await fetch(`/api/editor/get?slug=${encodeURIComponent(editSlug)}`)
    if (!res.ok) return
    const data = (await res.json()) as {
      frontmatter: Record<string, unknown> | null
      body: string
    }

    const fm = (data.frontmatter ?? {}) as Record<string, unknown>

    // helper to coerce array|string -> comma string
    const joinIfArray = (v: unknown) => {
      if (Array.isArray(v)) return v.map(String).join(', ')
      if (typeof v === 'string') return v
      return ''
    }

    setFrontmatter((prev) => ({
      ...prev,
      // scalar fields
      title: typeof fm.title === 'string' ? fm.title : prev.title,
      date: typeof fm.date === 'string' ? fm.date : prev.date,
      lastmod: typeof fm.lastmod === 'string' ? fm.lastmod : prev.lastmod,
      draft: typeof fm.draft === 'boolean' ? fm.draft : prev.draft,
      summary: typeof fm.summary === 'string' ? fm.summary : prev.summary,
      layout: typeof fm.layout === 'string' ? fm.layout : prev.layout,
      bibliography: typeof fm.bibliography === 'string' ? fm.bibliography : prev.bibliography,
      canonicalUrl: typeof fm.canonicalUrl === 'string' ? fm.canonicalUrl : prev.canonicalUrl,

      // arrays or comma-separated strings -> normalize to comma string
      tags: joinIfArray(fm.tags) || prev.tags,
      authors: joinIfArray(fm.authors) || prev.authors,
      images: joinIfArray(fm.images) || prev.images,
    }))

    // NEW: pick up status + feedback from frontmatter
    setStatus(typeof (fm as any).status === 'string' ? String((fm as any).status) : null)
    setRejectionFeedback(
      typeof (fm as any).feedback === 'string' ? String((fm as any).feedback) : null
    )

    setBody(data.body || '')
    setDirty(false)
    setLastAutoSave(null)
  }

  // ---- Load specific post when admin sets ADMIN_EDITOR_LOAD ----
  useEffect(() => {
    const slugToLoad = localStorage.getItem('ADMIN_EDITOR_LOAD')
    if (!slugToLoad) return

    // single-use: remove the key so it won't auto-load again
    localStorage.removeItem('ADMIN_EDITOR_LOAD')

    // call the existing loadPost function to populate editor
    loadPost(slugToLoad)
  }, [])
  // ---- END ----

  async function uploadImage(file: File): Promise<string> {
    const form = new FormData()
    form.append('slug', slug)
    form.append('file', file)
    const res = await fetch('/api/editor/upload', { method: 'POST', body: form })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error || 'Upload failed')
    }
    const data = (await res.json()) as {
      url: string
      message?: string
      blobUrl?: string
      filename?: string
    }

    // Show upload status message
    if (data.message) {
      setMessage(data.message)
    }

    return data.url // This will be the Vercel Blob CDN URL
  }

  function insertAtCursor(text: string) {
    const textarea = bodyRef.current
    if (!textarea) {
      setBody((prev) => `${prev}${text}`)
      return
    }
    const start = textarea.selectionStart ?? textarea.value.length
    const end = textarea.selectionEnd ?? textarea.value.length
    const before = textarea.value.substring(0, start)
    const after = textarea.value.substring(end)
    const next = `${before}${text}${after}`
    setBody(next)
    // Restore caret after inserted text
    requestAnimationFrame(() => {
      const pos = start + text.length
      textarea.selectionStart = textarea.selectionEnd = pos
      textarea.focus()
    })
  }

  const handlePaste: React.ClipboardEventHandler<HTMLTextAreaElement> = async (e) => {
    try {
      const items = e.clipboardData?.items || []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file && /^image\//.test(file.type)) {
            e.preventDefault()
            const url = await uploadImage(file)
            const baseName = (file.name || 'image').replace(/\.[^.]+$/, '')
            const mdx = `![${baseName}](${url})\n`
            insertAtCursor(mdx)
            setMessage('Image uploaded')
            return
          }
        }
      }
    } catch (err) {
      const error = err as Error
      setMessage(error.message)
    }
  }

  // NEW: autosave every 30s while dirty
  useEffect(() => {
    const interval = setInterval(() => {
      if (!dirty) return
      if (saving || autoSaving) return
      if (!frontmatter.title && !body.trim()) return

      // fire and forget
      void savePost('draft', { autosave: true })
    }, 30000)

    return () => clearInterval(interval)
  }, [dirty, saving, autoSaving, frontmatter.title, body, savePost])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">New MDX Post</h1>

    

      {/* NEW: Rejection banner if this post was rejected */}
      {status === 'rejected' && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p className="mb-1 font-semibold">This post was rejected by an admin.</p>
          {rejectionFeedback ? (
            <p>
              <span className="font-semibold">Feedback: </span>
              {rejectionFeedback}
            </p>
          ) : (
            <p>No specific feedback message was provided.</p>
          )}
          <p className="mt-2 text-xs text-red-700">
            Update your post based on this feedback, then click{' '}
            <strong>“Submit for review”</strong> to resubmit it.
          </p>
        </div>
      )}

      <form onSubmit={handleSaveDraft} className="space-y-6">
        {/* Your drafts */}
        <div className="rounded border border-gray-300 p-3 dark:bg-gray-900">
          <div className="mb-2 text-sm font-medium">Your drafts</div>
          <div className="flex gap-2">
            <select
              className="w-full rounded border border-gray-300 p-2 dark:bg-gray-950"
              onChange={(e) => e.target.value && loadPost(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>
                {draftPosts.length ? 'Select a draft' : 'No drafts yet'}
              </option>
              {draftPosts.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title} {p.status === 'pending_review' ? '(submitted)' : '(draft)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Existing published posts */}
        <div className="rounded border border-gray-300 p-3 dark:bg-gray-900">
          <div className="mb-2 text-sm font-medium">Edit existing post</div>
          <div className="flex gap-2">
            <select
              className="w-full rounded border border-gray-300 p-2 dark:bg-gray-950"
              disabled={loadingExisting || existingPosts.length === 0}
              onChange={(e) => e.target.value && loadPost(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>
                {loadingExisting
                  ? 'Loading…'
                  : existingPosts.length
                  ? 'Select a post'
                  : 'No posts found'}
              </option>
              {existingPosts.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col">
            <span className="mb-1 text-sm font-medium">Title *</span>
            <input
              className="rounded border border-gray-300 p-2 dark:bg-gray-900"
              value={frontmatter.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col">
            <span className="mb-1 text-sm font-medium">Date *</span>
            <input
              type="date"
              className="rounded border border-gray-300 p-2 dark:bg-gray-900"
              value={frontmatter.date}
              onChange={(e) => handleChange('date', e.target.value)}
              required
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={frontmatter.draft}
              onChange={(e) => handleChange('draft', e.target.checked)}
            />
            <span className="text-sm font-medium">Draft</span>
          </label>
          <div className="self-end text-sm text-gray-600 dark:text-gray-400">Slug: {slug}</div>
        </div>

        <label className="flex flex-col">
          <span className="mb-1 text-sm font-medium">Summary</span>
          <textarea
            className="min-h-[80px] rounded border border-gray-300 p-2 dark:bg-gray-900"
            value={frontmatter.summary}
            onChange={(e) => handleChange('summary', e.target.value)}
          />
        </label>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col">
            <span className="mb-1 text-sm font-medium">Tags (comma separated)</span>
            <input
              className="rounded border border-gray-300 p-2 dark:bg-gray-900"
              value={frontmatter.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="nextjs, tailwind, mdx"
            />
          </label>
          <label className="flex flex-col">
            <span className="mb-1 text-sm font-medium">Authors (comma separated)</span>
            <input
              className="rounded border border-gray-300 p-2 dark:bg-gray-900"
              value={frontmatter.authors}
              onChange={(e) => handleChange('authors', e.target.value)}
            />
          </label>
          <label className="flex flex-col">
            <span className="mb-1 text-sm font-medium">Images (comma separated URLs)</span>
            <input
              className="rounded border border-gray-300 p-2 dark:bg-gray-900"
              value={frontmatter.images}
              onChange={(e) => handleChange('images', e.target.value)}
            />
          </label>
          <label className="flex flex-col">
            <span className="mb-1 text-sm font-medium">Last Modified</span>
            <input
              type="date"
              className="rounded border border-gray-300 p-2 dark:bg-gray-900"
              value={frontmatter.lastmod}
              onChange={(e) => handleChange('lastmod', e.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="flex flex-col">
            <span className="mb-1 text-sm font-medium">Layout</span>
            <input
              className="rounded border border-gray-300 p-2 dark:bg-gray-900"
              value={frontmatter.layout}
              onChange={(e) => handleChange('layout', e.target.value)}
              placeholder="PostSimple or PostLayout"
            />
          </label>
          <label className="flex flex-col md:col-span-2">
            <span className="mb-1 text-sm font-medium">Canonical URL</span>
            <input
              className="rounded border border-gray-300 p-2 dark:bg-gray-900"
              value={frontmatter.canonicalUrl}
              onChange={(e) => handleChange('canonicalUrl', e.target.value)}
            />
          </label>
          <label className="flex flex-col md:col-span-3">
            <span className="mb-1 text-sm font-medium">Bibliography (path)</span>
            <input
              className="rounded border border-gray-300 p-2 dark:bg-gray-900"
              value={frontmatter.bibliography}
              onChange={(e) => handleChange('bibliography', e.target.value)}
              placeholder="data/references-data.bib"
            />
          </label>
        </div>

        <label className="flex flex-col">
          <span className="mb-1 text-sm font-medium">MDX Body</span>
          <textarea
            className="min-h-[480px] rounded border border-gray-300 p-2 font-mono dark:bg-gray-900"
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onPaste={handlePaste}
            placeholder={'\n## Hello MDX\n\nWrite your content here...'}
          />
        </label>
        <div className="flex flex-col">
          <span className="mb-1 text-sm font-medium">Live Preview</span>
          <div
            className="prose dark:prose-invert max-w-none rounded border border-gray-300 p-3 dark:bg-gray-900"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Save as draft */}
          <button
            type="submit"
            disabled={saving || autoSaving}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : autoSaving ? 'Autosaving…' : 'Save Draft'}
          </button>

          {/* Submit for review / resubmit */}
          <button
            type="button"
            disabled={saving || autoSaving}
            onClick={handleSubmitForReview}
            className="rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Submitting…' : 'Submit for review'}
          </button>

          {message && (
            <span className="text-sm text-gray-700 dark:text-gray-300">{message}</span>
          )}

          {lastAutoSave && (
            <span className="text-xs text-gray-500">Autosaved at {lastAutoSave}</span>
          )}
        </div>
      </form>
    </div>
  )
}
