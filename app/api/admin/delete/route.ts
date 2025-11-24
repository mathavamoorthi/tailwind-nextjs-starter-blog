import { NextResponse } from 'next/server'
import path from 'path'
import { unlink, access } from 'fs/promises'
import { constants as fsConstants } from 'fs'

// If you're using edge runtime somewhere, force Node for fs:
export const runtime = 'nodejs'

// --- copy of isAdmin logic used in /api/admin/drafts ---
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

// POST /api/admin/delete
export async function POST(request: Request) {
  try {
    // 1) Admin auth
    if (!isAdmin(request)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 401 })
    }

    // 2) Read slug from body
    const body = await request.json().catch(() => null) as { slug?: string } | null
    const slug = body?.slug

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Missing slug' }, { status: 400 })
    }

    // 3) Build path to data/drafts/<slug>.mdx
    const draftsDir = path.join(process.cwd(), 'data', 'drafts')
    const filePath = path.join(draftsDir, `${slug}.mdx`)

    // 4) Check if file exists
    try {
      await access(filePath, fsConstants.F_OK)
    } catch {
      return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 })
    }

    // 5) Delete the file
    await unlink(filePath)
    console.log(`Deleted draft: ${slug}.mdx`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting draft:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to delete draft' },
      { status: 500 }
    )
  }
}
