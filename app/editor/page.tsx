"use client"

import { useState, useMemo, useRef } from 'react'

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
      setMessage(`Saved: ${data.path}`)
    } catch (err) {
      const error = err as Error
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
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
    const data = (await res.json()) as { url: string }
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
      <form onSubmit={handleSubmit} className="space-y-6">
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
            className="min-h-[280px] rounded border border-gray-300 p-2 font-mono dark:bg-gray-900"
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onPaste={handlePaste}
            placeholder={"\n## Hello MDX\n\nWrite your content here..."}
          />
        </label>

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


