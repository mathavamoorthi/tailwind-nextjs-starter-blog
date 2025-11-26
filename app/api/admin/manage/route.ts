import { NextResponse } from 'next/server'
import path from 'path'
import { readdir, readFile } from 'fs/promises'
import matter from 'gray-matter'

function isAdmin(request: Request): boolean {
  const authHeader = request.headers.get('authorization') || ''
  const adminUsers = process.env.ADMIN_USERS || ''

  if (!adminUsers) return false

  const admins = adminUsers.split(',').map((u) => u.trim())

  for (const admin of admins) {
    const [username, password] = admin.split(':')
    const expected = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
    if (authHeader === expected) {
      return true
    }
  }

  return false
}

type DraftSummary = {
  slug: string
  title: string
  authors: string[]
  status: string
  createdAt: string
  updatedAt: string
}

type PublishedSummary = {
  slug: string
  title: string
  authors: string[]
  publishedAt: string
  updatedAt: string
}

export async function GET(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const draftsDir = path.join(process.cwd(), 'data', 'drafts')
    const blogDir = path.join(process.cwd(), 'data', 'blog')

    // ---------- DRAFTS (draft / pending_review / rejected etc.) ----------
    let draftFiles: string[] = []
    try {
      draftFiles = await readdir(draftsDir)
    } catch {
      draftFiles = []
    }

    const draftSummaries: DraftSummary[] = (
      await Promise.all(
        draftFiles
          .filter((f) => f.endsWith('.mdx'))
          .map(async (f) => {
            try {
              const full = path.join(draftsDir, f)
              const raw = await readFile(full, 'utf-8')
              const { data, content } = matter(raw)

              const title = (data?.title as string) || f.replace(/\.mdx$/, '')

              const authors = Array.isArray((data as any)?.authors)
                ? ((data as any).authors as unknown[]).map(String)
                : typeof (data as any)?.authors === 'string' &&
                    String((data as any).authors)
                  ? [String((data as any).authors)]
                  : []

              const status =
                (data?.status as string) ??
                ((data as any)?.draft === false ? 'pending_review' : 'draft')

              const createdAt = (data?.createdAt as string) || ''
              const updatedAt = (data?.updatedAt as string) || createdAt || ''

              return {
                slug: f.replace(/\.mdx$/, ''),
                title,
                authors,
                status,
                createdAt,
                updatedAt,
              }
            } catch (err) {
              console.error('Error reading draft', f, err)
              return null
            }
          })
      )
    ).filter((d): d is DraftSummary => d !== null)

    // ---------- PUBLISHED (data/blog) ----------
    let blogFiles: string[] = []
    try {
      blogFiles = await readdir(blogDir)
    } catch {
      blogFiles = []
    }

    const publishedSummaries: PublishedSummary[] = (
      await Promise.all(
        blogFiles
          .filter((f) => f.endsWith('.mdx')) // ignore subfolders like blog/drafts
          .map(async (f) => {
            try {
              const full = path.join(blogDir, f)
              const raw = await readFile(full, 'utf-8')
              const { data } = matter(raw)

              const title = (data?.title as string) || f.replace(/\.mdx$/, '')

              const authors = Array.isArray((data as any)?.authors)
                ? ((data as any).authors as unknown[]).map(String)
                : typeof (data as any)?.authors === 'string' &&
                    String((data as any).authors)
                  ? [String((data as any).authors)]
                  : []

              const publishedAt =
                (data as any)?.publishedAt ||
                (data as any)?.date ||
                ''

              const updatedAt =
                (data as any)?.updatedAt ||
                publishedAt ||
                ''

              return {
                slug: f.replace(/\.mdx$/, ''),
                title,
                authors,
                publishedAt,
                updatedAt,
              }
            } catch (err) {
              console.error('Error reading blog file', f, err)
              return null
            }
          })
      )
    ).filter((p): p is PublishedSummary => p !== null)

    return NextResponse.json({
      drafts: draftSummaries,
      published: publishedSummaries,
      totalDrafts: draftSummaries.length,
      totalPublished: publishedSummaries.length,
    })
  } catch (error) {
    console.error('Error in /api/admin/manage:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}
