import { NextResponse } from 'next/server'
import path from 'path'
import { readdir, readFile } from 'fs/promises'
import matter from 'gray-matter'

export async function GET() {
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
            return { title, slug: f.replace(/\.mdx$/, '') }
          } catch {
            return { title: f.replace(/\.mdx$/, ''), slug: f.replace(/\.mdx$/, '') }
          }
        })
    )
    return NextResponse.json({ posts })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ posts: [] })
  }
}


