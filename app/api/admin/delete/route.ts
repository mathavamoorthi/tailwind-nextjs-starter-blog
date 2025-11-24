import { NextResponse } from 'next/server'

// Run on Node.js so we can use network/fetch normally
export const runtime = 'nodejs'

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

export async function POST(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as { slug?: string } | null
    const slug = body?.slug
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Missing slug' }, { status: 400 })
    }

    // --- GitHub config from env ---
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN
    const REPO_OWNER = process.env.GITHUB_REPO_OWNER
    const REPO_NAME = process.env.GITHUB_REPO_NAME
    const REPO_BRANCH = process.env.GITHUB_REPO_BRANCH || 'main'

    if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
      console.error('GitHub env vars missing')
      return NextResponse.json(
        { success: false, error: 'Server GitHub config missing' },
        { status: 500 },
      )
    }

    const filePath = `data/drafts/${slug}.mdx`

    // 1) Get file metadata to obtain `sha`
    const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(
      filePath,
    )}?ref=${encodeURIComponent(REPO_BRANCH)}`

    const ghHeaders = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'nova-blog-admin',
      Accept: 'application/vnd.github.v3+json',
    }

    const getResp = await fetch(getUrl, { headers: ghHeaders })

    if (getResp.status === 404) {
      return NextResponse.json(
        { success: false, error: 'Draft file not found in repo' },
        { status: 404 },
      )
    }

    if (!getResp.ok) {
      const text = await getResp.text()
      console.error('GitHub GET error:', getResp.status, text)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch file from GitHub' },
        { status: 502 },
      )
    }

    const fileInfo = (await getResp.json()) as { sha?: string }
    const sha = fileInfo.sha
    if (!sha) {
      return NextResponse.json(
        { success: false, error: 'Missing file SHA from GitHub' },
        { status: 500 },
      )
    }

    // 2) Delete the file via GitHub API
    const deleteUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(
      filePath,
    )}`

    const deleteResp = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: ghHeaders,
      body: JSON.stringify({
        message: `Delete draft: ${slug}`,
        sha,
        branch: REPO_BRANCH,
      }),
    })

    if (!deleteResp.ok) {
      const text = await deleteResp.text()
      console.error('GitHub DELETE error:', deleteResp.status, text)
      return NextResponse.json(
        { success: false, error: 'GitHub failed to delete file' },
        { status: 502 },
      )
    }

    console.log(`Deleted draft via GitHub: ${filePath}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in /api/admin/delete:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to delete draft' },
      { status: 500 },
    )
  }
}
