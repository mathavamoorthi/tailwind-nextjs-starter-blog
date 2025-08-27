import { NextResponse } from 'next/server'
import path from 'path'
import { readdir, readFile } from 'fs/promises'
import matter from 'gray-matter'

function getRequestAuthor(request: Request): string | null {
  const header = request.headers.get('x-editor-author')
  if (!header) return null
  return header.trim()
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
            const { data } = matter(raw)
            const title = (data?.title as string) || f.replace(/\.mdx$/, '')
            const authors = Array.isArray((data as any)?.authors)
              ? ((data as any).authors as unknown[]).map(String)
              : (typeof (data as any)?.authors === 'string' && String((data as any).authors))
              ? [String((data as any).authors)]
              : []
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


