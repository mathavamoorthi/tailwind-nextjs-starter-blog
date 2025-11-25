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
    const dir = path.join(process.cwd(), 'data', 'drafts')
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
              : typeof (data as any)?.authors === 'string' && String((data as any).authors)
                ? [String((data as any).authors)]
                : []

            const status = (data as any)?.status
              ? String((data as any).status)
              : (data as any)?.draft === false
                ? 'pending_review'
                : 'draft'

            return { title, slug: f.replace(/\.mdx$/, ''), authors, status }
          } catch (err) {
            console.error('Failed to read draft file:', f, err)
            return {
              title: f.replace(/\.mdx$/, ''),
              slug: f.replace(/\.mdx$/, ''),
              authors: [] as string[],
              status: 'draft',
            }
          }
        })
    )

    const author = getRequestAuthor(request)

    // If you want to see all drafts for debugging, temporarily skip author filter:
    // const byAuthor = posts

    const byAuthor = author ? posts.filter((p) => p.authors.includes(author)) : posts

    return NextResponse.json({
      posts: byAuthor.map(({ title, slug, status }) => ({ title, slug, status })),
    })
  } catch (e) {
    console.error('Error listing drafts:', e)
    return NextResponse.json({ posts: [] })
  }
}
