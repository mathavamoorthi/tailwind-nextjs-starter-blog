"use client"

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

  const handleChange = (
    key: keyof Frontmatter,
    value: string | boolean
  ) => {
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
      
      // Show appropriate message based on save result
      if (data.github?.committed) {
        if (data.images && data.images.committed && data.images.committed.length > 0) {
          setMessage(`✅ Saved: ${data.path} - Blog post and ${data.images.committed.length} images committed to GitHub! Revalidating pages...`)
        } else {
          setMessage(`✅ Saved: ${data.path} - Pushed to GitHub! Revalidating pages...`)
        }
      } else if (data.local) {
        setMessage(`✅ Saved: ${data.path} - Saved locally (GitHub not configured)`)
      } else {
        setMessage(`✅ Saved: ${data.path} - Revalidating pages...`)
      }
      
      setDirty(false)
      
      // Wait a moment for revalidation to complete
      setTimeout(() => {
        if (data.github?.committed) {
          if (data.images && data.images.committed && data.images.committed.length > 0) {
            setMessage(`✅ Published: ${data.path} - Blog post and ${data.images.committed.length} images committed to GitHub & pages updated!`)
          } else {
            setMessage(`✅ Published: ${data.path} - Pushed to GitHub & pages updated!`)
          }
        } else if (data.local) {
          setMessage(`✅ Saved: ${data.path} - Saved locally`)
        } else {
          setMessage(`✅ Saved: ${data.path} - Pages updated!`)
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
      frontmatter: Partial<Frontmatter> & { title?: string; date?: string }
      body: string
    }
    setFrontmatter((prev) => ({
      ...prev,
      ...data.frontmatter,
      // Coerce arrays back into comma-separated strings where needed
      tags: Array.isArray((data.frontmatter as any).tags)
        ? (data.frontmatter as any).tags.join(', ')
        : (data.frontmatter as any).tags || '',
      authors: Array.isArray((data.frontmatter as any).authors)
        ? (data.frontmatter as any).authors.join(', ')
        : (data.frontmatter as any).authors || '',
      images: Array.isArray((data.frontmatter as any).images)
        ? (data.frontmatter as any).images.join(', ')
        : (data.frontmatter as any).images || '',
    }))
    setBody(data.body || '')
  }

  async function uploadImage(file: File): Promise<string> {
    const form = new FormData()
    form.append('slug', slug)
    form.append('file', file)
    const res = await fetch('/api/editor/upload', { method: 'POST', body: form })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error || 'Upload failed')
    }
    const data = await res.json() as { 
      url: string; 
      message?: string; 
      tempStored?: boolean; 
      githubCommitted?: boolean; 
      githubError?: string; 
      filename?: string 
    }
    
    // Show upload status message
    if (data.message) {
      setMessage(data.message)
    }
    
    // Show detailed status
    if (data.githubCommitted) {
      setMessage(`✅ Image uploaded and committed to GitHub: ${data.filename}`)
    } else if (data.githubError) {
      setMessage(`⚠️ Image uploaded for preview (GitHub commit failed: ${data.githubError})`)
    } else if (data.tempStored) {
      setMessage('✅ Image uploaded for preview (GitHub not configured)')
    }
    
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">New MDX Post</h1>
      
      {/* GitHub Status */}
      {githubStatus && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${
          githubStatus.configured 
            ? 'bg-green-100 border border-green-300 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200' 
            : 'bg-yellow-100 border border-yellow-300 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200'
        }`}>
          {githubStatus.configured ? (
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span>GitHub Integration: {githubStatus.owner}/{githubStatus.repo}</span>
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
                {loadingExisting ? 'Loading…' : existingPosts.length ? 'Select a post' : 'No posts found'}
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
          <div className="text-sm text-gray-600 dark:text-gray-400 self-end">Slug: {slug}</div>
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
            placeholder={"\n## Hello MDX\n\nWrite your content here..."}
          />
        </label>
        <div className="flex flex-col">
          <span className="mb-1 text-sm font-medium">Live Preview</span>
          <div
            className="prose max-w-none rounded border border-gray-300 p-3 dark:prose-invert dark:bg-gray-900"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>

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


