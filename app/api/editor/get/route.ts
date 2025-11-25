import { NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import matter from 'gray-matter'

function getRequestAuthor(request: Request): string | null {
  const header = request.headers.get('x-editor-author')
  if (!header) return null
  return header.trim()
}

async function loadFileIfExists(dir: string, slug: string): Promise<string | null> {
  try {
    const full = path.join(dir, `${slug}.mdx`)
    const raw = await readFile(full, 'utf-8')
    return raw
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = (searchParams.get('slug') || '').toLowerCase()

    if (!slug || /[^a-z0-9-]/.test(slug)) {
      return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
    }

    const baseDir = process.cwd()
    const draftsDir = path.join(baseDir, 'data', 'drafts')
    const blogDir = path.join(baseDir, 'data', 'blog')

    // 1) Try drafts first
    let raw = await loadFileIfExists(draftsDir, slug)
    let source: 'drafts' | 'blog' | null = null

    if (raw) {
      source = 'drafts'
    } else {
      // 2) Fallback to blog
      raw = await loadFileIfExists(blogDir, slug)
      if (raw) {
        source = 'blog'
      }
    }

    if (!raw || !source) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    const parsed = matter(raw)
    const authors = Array.isArray((parsed.data as any)?.authors)
      ? ((parsed.data as any).authors as unknown[]).map(String)
      : typeof (parsed.data as any)?.authors === 'string' && String((parsed.data as any).authors)
        ? [String((parsed.data as any).authors)]
        : []

    const actorAuthor = getRequestAuthor(request)

    // Same author check as before (applies to both blog and drafts)
    if (actorAuthor && authors.length > 0 && !authors.includes(actorAuthor)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      frontmatter: parsed.data,
      body: parsed.content,
      source,
    })
  } catch (e) {
    console.error('Error in /api/editor/get:', e)
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
}
