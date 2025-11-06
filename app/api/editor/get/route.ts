import { NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import matter from 'gray-matter'

type ParsedFrontmatter = {
  authors?: string[] | string
  [key: string]: unknown
}

function getRequestAuthor(request: Request): string | null {
  const header = request.headers.get('x-editor-author')
  if (!header) return null
  return header.trim()
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = (searchParams.get('slug') || '').toLowerCase()
    if (!slug || /[^a-z0-9-]/.test(slug)) {
      return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
    }

    const filePath = path.join(process.cwd(), 'data', 'blog', `${slug}.mdx`)
    const raw = await readFile(filePath, 'utf-8')
    const parsed = matter(raw)

    // Normalize authors safely without using `any`
    const fm = parsed.data as ParsedFrontmatter
    let authors: string[] = []
    if (Array.isArray(fm.authors)) {
      authors = fm.authors.map((a) => String(a))
    } else if (typeof fm.authors === 'string' && fm.authors.trim()) {
      authors = [fm.authors.trim()]
    }

    const author = getRequestAuthor(request)
    if (author && authors.length > 0 && !authors.includes(author)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    return NextResponse.json({ frontmatter: fm, body: parsed.content })
  } catch (e) {
    console.error('editor/get error:', e)
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
}
