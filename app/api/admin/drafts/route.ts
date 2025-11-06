import { NextResponse } from 'next/server'
import path from 'path'
import { readdir, readFile } from 'fs/promises'
import matter from 'gray-matter'

// Admin authentication check
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

type ParsedFrontmatter = {
  title?: string
  authors?: string[] | string
  status?: string
  createdAt?: string
  updatedAt?: string
  feedback?: string
  [key: string]: unknown
}

export async function GET(request: Request) {
  try {
    // Check admin authentication
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const draftsDir = path.join(process.cwd(), 'data', 'drafts')
    const publishedDir = path.join(process.cwd(), 'data', 'blog')

    // Get all draft files
    let draftFiles: string[] = []
    try {
      draftFiles = await readdir(draftsDir)
    } catch {
      // Drafts directory doesn't exist yet
      draftFiles = []
    }

    // Get all published files to check for conflicts
    let publishedFiles: string[] = []
    try {
      publishedFiles = await readdir(publishedDir)
    } catch {
      publishedFiles = []
    }

    const drafts = await Promise.all(
      draftFiles
        .filter((f) => f.endsWith('.mdx'))
        .map(async (f) => {
          try {
            const full = path.join(draftsDir, f)
            const raw = await readFile(full, 'utf-8')
            const parsed = matter(raw)
            const data = parsed.data as ParsedFrontmatter
            const content = parsed.content || ''

            // title
            const title =
              typeof data.title === 'string' && data.title.trim()
                ? data.title
                : f.replace(/\.mdx$/, '')

            // authors: string[] normalized
            let authors: string[] = []
            if (Array.isArray(data.authors)) {
              authors = data.authors.map((a) => String(a))
            } else if (typeof data.authors === 'string' && data.authors.trim()) {
              authors = [data.authors.trim()]
            }

            const status = typeof data.status === 'string' ? data.status : 'draft'
            const createdAt =
              typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()
            const updatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : createdAt
            const feedback = typeof data.feedback === 'string' ? data.feedback : ''

            // Check if this slug already exists in published posts
            const slug = f.replace(/\.mdx$/, '')
            const isConflict = publishedFiles.includes(f)

            return {
              slug,
              title,
              authors,
              status,
              createdAt,
              updatedAt,
              isConflict,
              excerpt: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
              feedback,
            }
          } catch (error) {
            console.error(`Error reading draft ${f}:`, error)
            return null
          }
        })
    )

    // Type guard to narrow out nulls
    const validDrafts = drafts.filter((d): d is NonNullable<typeof d> => d !== null)

    return NextResponse.json({
      drafts: validDrafts,
      total: validDrafts.length,
    })
  } catch (error) {
    console.error('Error fetching drafts:', error)
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 })
  }
}
