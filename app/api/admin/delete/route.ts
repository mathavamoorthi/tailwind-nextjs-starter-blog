import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

// Force Node runtime (needed for fs)
export const runtime = 'nodejs'

// Same admin check as in /api/admin/drafts
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
    // 1) Auth
    if (!isAdmin(request)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 401 }
      )
    }

    // 2) Get slug from body
    const body = (await request.json().catch(() => null)) as { slug?: string } | null
    const slug = body?.slug

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Missing slug' },
        { status: 400 }
      )
    }

    // 3) Build file path: data/drafts/<slug>.mdx
    const draftsDir = path.join(process.cwd(), 'data', 'drafts')
    const filePath = path.join(draftsDir, `${slug}.mdx`)

    // 4) Try to delete the file
    try {
      await fs.unlink(filePath)
    } catch (err: any) {
      // If file is not found
      if (err && err.code === 'ENOENT') {
        return NextResponse.json(
          { success: false, error: 'Draft not found' },
          { status: 404 }
        )
      }

      console.error('Error unlinking draft:', err)
      return NextResponse.json(
        { success: false, error: 'Failed to delete draft file' },
        { status: 500 }
      )
    }

    console.log(`Deleted draft: ${slug}.mdx`)

    // 5) Success
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in /api/admin/delete:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to delete draft' },
      { status: 500 }
    )
  }
}
