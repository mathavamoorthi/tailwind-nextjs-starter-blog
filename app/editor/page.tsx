'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
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
  const [message, setMessage] = useState<string>('')
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [dirty, setDirty] = useState<boolean>(false)
  const [loadingExisting, setLoadingExisting] = useState<boolean>(false)
  const [existingPosts, setExistingPosts] = useState<{ title: string; slug: string }[]>([])
  const [githubStatus, setGitHubStatus] = useState<{
    configured: boolean
    owner: string | null
    repo: string | null
  } | null>(null)

  const slug = useMemo(() => slugify(frontmatter.title || 'untitled'), [frontmatter.title])

  const handleChange = (key: keyof Frontmatter, value: string | boolean) => {
    setFrontmatter((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/editor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontmatter, body, slug }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to save')
      }
      const data = await res.json()

      if (data.github?.committed) {
        if (data.images && data.images.processed && data.images.processed.length > 0) {
          setMessage(
            `✅ Draft saved: ${data.path} - ${data.images.processed.length} images processed. Awaiting admin approval.`
          )
        } else {
          setMessage(`✅ Draft saved: ${data.path} - Awaiting admin approval.`)
        }
      } else if (data.local) {
        setMessage(`✅ Draft saved: ${data.path} - Saved locally (GitHub not configured)`)
      } else {
        setMessage(`✅ Draft saved: ${data.path} - Awaiting admin approval.`)
      }

      setDirty(false)
      setTimeout(() => {
        if (data.github?.committed) {
          if (data.images && data.images.processed && data.images.processed.length > 0) {
            setMessage(
              `✅ Draft saved: ${data.path} - ${data.images.processed.length} images processed. Awaiting admin approval.`
            )
          } else {
            setMessage(`✅ Draft saved: ${data.path} - Awaiting admin approval.`)
          }
        } else if (data.local) {
          setMessage(`✅ Draft saved: ${data.path} - Saved locally`)
        } else {
          setMessage(`✅ Draft saved: ${data.path} - Awaiting admin approval.`)
        }
      }, 2000)
    } catch (err) {
      const error = err as Error
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
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

  // Load existing posts for quick editing
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

    setBody(data.body || '')
  }

  // ---- AUTO-LOAD FROM ADMIN (single-use) ----
  // Editor: read single-use payload from sessionStorage (admin->editor handoff)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('ADMIN_EDITOR_PAYLOAD')
      if (!raw) {
        console.log('[Editor] no ADMIN_EDITOR_PAYLOAD found in sessionStorage')
        return
      }
      // remove immediately so it's single-use
      sessionStorage.removeItem('ADMIN_EDITOR_PAYLOAD')
      console.log('[Editor] ADMIN_EDITOR_PAYLOAD found, loading into editor')

      const payload = JSON.parse(raw) as {
        slug?: string
        frontmatter?: Record<string, unknown>
        body?: string
      }

      // If payload contains frontmatter/body, set into editor state directly
      if (payload.frontmatter || typeof payload.body === 'string') {
        const fm = payload.frontmatter ?? {}
        // reuse your existing logic to coerce arrays -> comma strings
        const joinIfArray = (v: unknown) => {
          if (Array.isArray(v)) return v.map(String).join(', ')
          if (typeof v === 'string') return v
          return ''
        }

        setFrontmatter((prev) => ({
          ...prev,
          title: typeof fm.title === 'string' ? fm.title : prev.title,
          date: typeof fm.date === 'string' ? fm.date : prev.date,
          lastmod: typeof fm.lastmod === 'string' ? fm.lastmod : prev.lastmod,
          draft: typeof fm.draft === 'boolean' ? fm.draft : prev.draft,
          summary: typeof fm.summary === 'string' ? fm.summary : prev.summary,
          layout: typeof fm.layout === 'string' ? fm.layout : prev.layout,
          bibliography: typeof fm.bibliography === 'string' ? fm.bibliography : prev.bibliography,
          canonicalUrl: typeof fm.canonicalUrl === 'string' ? fm.canonicalUrl : prev.canonicalUrl,
          tags: joinIfArray(fm.tags) || prev.tags,
          authors: joinIfArray(fm.authors) || prev.authors,
          images: joinIfArray(fm.images) || prev.images,
        }))

        setBody(payload.body ?? '')
        // optional: set slug preview if frontmatter title present
        if (payload.slug) {
          // if you want to auto-set slug in UI or show somewhere, do it here
          console.log('[Editor] loaded slug from payload:', payload.slug)
        }
      } else {
        console.warn('[Editor] payload did not contain expected frontmatter/body')
      }
    } catch (err) {
      console.error('[Editor] error loading ADMIN_EDITOR_PAYLOAD:', err)
    }
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

    if (data.message) setMessage(data.message)
    return data.url
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">New MDX Post</h1>

      {/* Workflow Explanation */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900">
        <h3 className="mb-2 text-lg font-semibold text-blue-800 dark:text-blue-200">
          🚀 Vercel Blob Image Workflow
        </h3>
        <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
          <p>
            • <strong>Images are uploaded to Vercel Blob Storage</strong> for immediate preview
          </p>
          <p>
            • <strong>CDN URLs are inserted</strong> into MDX for instant rendering
          </p>
          <p>
            • <strong>When you publish</strong>, images are downloaded and committed to GitHub
          </p>
          <p>
            • <strong>MDX URLs are updated</strong> to use local paths for production
          </p>
          <p>
            • <strong>Vercel automatically redeploys</strong> with the final images
          </p>
        </div>
      </div>

      {githubStatus && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm ${githubStatus.configured ? 'border border-green-300 bg-green-100 text-green-800 dark:border-green-700 dark:bg-green-900 dark:text-green-200' : 'border border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'}`}
        >
          {githubStatus.configured ? (
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span>
                GitHub Integration: {githubStatus.owner}/{githubStatus.repo}
              </span>
              <span className="text-xs">(Posts will be automatically pushed to GitHub)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>GitHub Integration: Not configured</span>
              <span className="text-xs">(Posts will be saved locally only)</span>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* rest of the form (unchanged) */}
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

        {/* (title/date/draft/slug inputs, summary, tags/authors/images, layout/canonical/bibliography, MDX body, preview, submit) */}
        {/* ... (the rest of your original form JSX remains the same) ... */}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save MDX'}
          </button>
          {message && <span className="text-sm text-gray-700 dark:text-gray-300">{message}</span>}
        </div>
      </form>
    </div>
  )
}
