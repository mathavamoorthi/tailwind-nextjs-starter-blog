import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { GitHubAPI } from '../../../../lib/github'
import { revalidatePath } from 'next/cache'

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

async function deleteLocalFile(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath)
    console.log(`Deleted local file: ${filePath}`)
    return true
  } catch (err: any) {
    if (err && err.code === 'ENOENT') {
      // file not found – not an error, just means nothing to delete here
      return false
    }
    console.error(`Error unlinking local file ${filePath}:`, err)
    throw err
  }
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

    if (/[^a-z0-9-]/.test(slug)) {
      return NextResponse.json(
        { success: false, error: 'Invalid slug' },
        { status: 400 }
      )
    }

    // 3) Build file paths
    const draftsDir = path.join(process.cwd(), 'data', 'drafts')
    const blogDir = path.join(process.cwd(), 'data', 'blog')
    const draftPath = path.join(draftsDir, `${slug}.mdx`)
    const blogPath = path.join(blogDir, `${slug}.mdx`)

    let deletedSomething = false

    // 4) Try to delete local files (dev / preview)
    try {
      const deletedDraft = await deleteLocalFile(draftPath)
      const deletedBlog = await deleteLocalFile(blogPath)
      if (deletedDraft || deletedBlog) {
        deletedSomething = true
      }
    } catch (err) {
      // local delete errors are logged in helper; don't abort yet,
      // GitHub delete may still work in production
      console.error('Local delete error (continuing to GitHub):', err)
    }

    // 5) Try to delete from GitHub repo (production)
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
      try {
        const github = new GitHubAPI(
          process.env.GITHUB_TOKEN,
          process.env.GITHUB_OWNER,
          process.env.GITHUB_REPO
        )

        // Try drafts path
        try {
          await github.deleteFile(`data/drafts/${slug}.mdx`, `Delete draft: ${slug}`)
          console.log(`Deleted draft from GitHub: data/drafts/${slug}.mdx`)
          deletedSomething = true
        } catch (e) {
          console.warn('GitHub draft delete failed (maybe not present):', e)
        }

        // Try blog path
        try {
          await github.deleteFile(`data/blog/${slug}.mdx`, `Delete post: ${slug}`)
          console.log(`Deleted blog post from GitHub: data/blog/${slug}.mdx`)
          deletedSomething = true
        } catch (e) {
          console.warn('GitHub blog delete failed (maybe not present):', e)
        }
      } catch (err) {
        console.error('GitHub delete error:', err)
        // don’t fail immediately; we’ll check deletedSomething below
      }
    }

    if (!deletedSomething) {
      return NextResponse.json(
        { success: false, error: 'No matching draft or published post found to delete' },
        { status: 404 }
      )
    }

    // 6) Revalidate blog pages so the deleted post disappears from listings
    try {
      revalidatePath('/blog')
      revalidatePath('/blog/[page]', 'page')
      revalidatePath('/tags')
      revalidatePath('/tags/[tag]', 'page')
      revalidatePath('/tags/[tag]/page/[page]', 'page')
    } catch (e) {
      console.error('Revalidation error after delete:', e)
    }

    // 7) Success
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in /api/admin/delete:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to delete draft file' },
      { status: 500 }
    )
  }
}
