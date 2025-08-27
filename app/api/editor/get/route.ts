import { NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import matter from 'gray-matter'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = (searchParams.get('slug') || '').toLowerCase()
    if (!slug || /[^a-z0-9-]/.test(slug)) {
      return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
    }
    const filePath = path.join(process.cwd(), 'data', 'blog', `${slug}.mdx`)
    const raw = await readFile(filePath, 'utf-8')
    const parsed = matter(raw)
    return NextResponse.json({ frontmatter: parsed.data, body: parsed.content })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
}


