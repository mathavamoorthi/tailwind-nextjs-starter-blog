import { NextResponse } from 'next/server'
import path from 'path'
import { readdir, readFile } from 'fs/promises'
import matter from 'gray-matter'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const draftsDir = path.join(process.cwd(), 'data', 'drafts')
    const blogDir = path.join(process.cwd(), 'data', 'blog')

    async function loadFromDir(dir: string) {
      let files: string[] = []
      try {
        files = await readdir(dir)
      } catch {
        files = []
      }

      const posts = await Promise.all(
        files
          .filter((f) => f.endsWith('.mdx'))
          .map(async (f) => {
            try {
              const full = path.join(dir, f)
              const raw = await readFile(full, 'utf-8')
              const { data } = matter(raw)

              const title =
                (data?.title as string) || f.replace(/\.mdx$/, '')

              const slug = f.replace(/\.mdx$/, '')

              return { title, slug }
            } catch (err) {
              console.error(`Error reading ${dir}/${f}:`, err)
              return null
            }
          })
      )

      return posts.filter((p) => p !== null)
    }

    const [draftPosts, blogPosts] = await Promise.all([
      loadFromDir(draftsDir),
      loadFromDir(blogDir),
    ])

    // merge; drafts first so if same slug exists, editor sees draft
    const bySlug = new Map<string, { title: string; slug: string }>()
    for (const p of draftPosts) bySlug.set(p.slug, p)
    for (const p of blogPosts) if (!bySlug.has(p.slug)) bySlug.set(p.slug, p)

    const posts = Array.from(bySlug.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    )

    return NextResponse.json({ posts })
  } catch (err) {
    console.error('Error listing editor posts:', err)
    return NextResponse.json(
      { error: 'Failed to list posts', posts: [] },
      { status: 500 },
    )
  }
}
