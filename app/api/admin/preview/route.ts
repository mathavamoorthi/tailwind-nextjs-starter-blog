import { NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

// 🔒 Same admin authentication logic as drafts/approve
function isAdmin(request: Request): boolean {
  const authHeader = request.headers.get('authorization') || ''
  const adminUsers = process.env.ADMIN_USERS || ''

  if (!adminUsers) return false

  const admins = adminUsers.split(',').map((u) => u.trim())
  for (const admin of admins) {
    const [username, password] = admin.split(':')
    const expected = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
    if (authHeader === expected) return true
  }
  return false
}

export async function GET(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const slug = (searchParams.get('slug') || '').toLowerCase()

    if (!slug || /[^a-z0-9-]/.test(slug)) {
      return NextResponse.json(
        { success: false, error: 'Slug required or invalid' },
        { status: 400 }
      )
    }

    const filePath = path.join(process.cwd(), 'data', 'drafts', `${slug}.mdx`)
    const raw = await readFile(filePath, 'utf-8')

    const { data, content } = matter(raw)

    // ---- Normalize frontmatter so UI can show it cleanly ----
    const title = typeof data.title === 'string' ? data.title : slug
    const date = typeof data.date === 'string' ? data.date : ''
    const summary = typeof data.summary === 'string' ? data.summary : ''

    const tags = Array.isArray(data.tags)
      ? (data.tags as unknown[]).map(String)
      : typeof data.tags === 'string'
        ? data.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : []

    const authors = Array.isArray(data.authors)
      ? (data.authors as unknown[]).map(String)
      : typeof data.authors === 'string'
        ? data.authors
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean)
        : []

    // ---- Compile MD content to HTML (approximate blog rendering) ----
    const file = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(content)

    const html = String(file)

    return NextResponse.json({
      success: true,
      post: {
        slug,
        title,
        date,
        summary,
        tags,
        authors,
        html,
      },
    })
  } catch (err) {
    console.error('Preview error:', err)
    return NextResponse.json({ success: false, error: 'Failed to load draft' }, { status: 500 })
  }
}
