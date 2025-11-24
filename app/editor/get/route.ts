import { NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import matter from 'gray-matter'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const slug = url.searchParams.get('slug')

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing slug', frontmatter: null, body: '' },
        { status: 400 },
      )
    }

    const draftsDir = path.join(process.cwd(), 'data', 'drafts')
    const blogDir = path.join(process.cwd(), 'data', 'blog')

    // Try drafts first
    const draftPath = path.join(draftsDir, `${slug}.mdx`)
    const blogPath = path.join(blogDir, `${slug}.mdx`)

    let fileContent: string | null = null
    let usedPath: string | null = null

    try {
      fileContent = await readFile(draftPath, 'utf-8')
      usedPath = draftPath
    } catch {
      // not in drafts, try blog
      try {
        fileContent = await readFile(blogPath, 'utf-8')
        usedPath = blogPath
      } catch {
        fileContent = null
      }
    }

    if (!fileContent) {
      return NextResponse.json(
        { error: 'Post not found', frontmatter: null, body: '' },
        { status: 404 },
      )
    }

    const { data, content } = matter(fileContent)

    return NextResponse.json({
      frontmatter: data || null,
      body: content || '',
      path: usedPath,
    })
  } catch (err) {
    console.error('Error in /api/editor/get:', err)
    return NextResponse.json(
      { error: 'Failed to load post', frontmatter: null, body: '' },
      { status: 500 },
    )
  }
}
