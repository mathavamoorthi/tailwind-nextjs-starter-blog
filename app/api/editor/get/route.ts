import { NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import matter from 'gray-matter'

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
    const authors = Array.isArray((parsed.data as any)?.authors)
      ? ((parsed.data as any).authors as unknown[]).map(String)
      : typeof (parsed.data as any)?.authors === 'string' && String((parsed.data as any).authors)
        ? [String((parsed.data as any).authors)]
        : []
    const author = getRequestAuthor(request)
    if (author && authors.length > 0 && !authors.includes(author)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    return NextResponse.json({ frontmatter: parsed.data, body: parsed.content })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
}
