import { NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

// 🔒 Reuse admin authentication (same logic as approve/drafts)
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
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'Slug required' }, { status: 400 })
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'drafts', `${slug}.mdx`)
    const raw = await readFile(filePath, 'utf-8')
    const { content } = matter(raw)

    const file = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(content)

    return NextResponse.json({ success: true, html: String(file) })
  } catch (err) {
    console.error('Preview error:', err)
    return NextResponse.json({ error: 'Failed to load draft' }, { status: 500 })
  }
}
