import { NextResponse } from 'next/server'
import path from 'path'
import { readdir, readFile } from 'fs/promises'
import matter from 'gray-matter'

function getRequestAuthor(request: Request): string | null {
  const header = request.headers.get('x-editor-author')
  if (!header) return null
  return header.trim()
}

type ParsedFrontmatter = {
  title?: string
  authors?: string[] | string
  [key: string]: unknown
}

export async function GET(request: Request) {
  try {
    const dir = path.join(process.cwd(), 'data', 'blog')
    const files = await readdir(dir)
    const posts = await Promise.all(
      files
        .filter((f) => f.endsWith('.mdx'))
        .map(async (f) => {
          try {
            const full = path.join(dir, f)
            const raw = await readFile(full, 'utf-8')
            const parsed = matter(raw)
            const data = parsed.data as ParsedFrontmatter

            const title =
              typeof data.title === 'string' && data.title.trim()
                ? data.title
                : f.replace(/\.mdx$/, '')

            let authors: string[] = []
            if (Array.isArray(data.authors)) {
              authors = data.authors.map((a) => String(a))
            } else if (typeof data.authors === 'string' && data.authors.trim()) {
              authors = [data.authors.trim()]
            }

            return { title, slug: f.replace(/\.mdx$/, ''), authors }
          } catch {
            return { title: f.replace(/\.mdx$/, ''), slug: f.replace(/\.mdx$/, ''), authors: [] }
          }
        })
    )
    const author = getRequestAuthor(request)
    const filtered = author ? posts.filter((p) => p.authors.includes(author)) : posts
    return NextResponse.json({ posts: filtered.map(({ title, slug }) => ({ title, slug })) })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ posts: [] })
  }
}
