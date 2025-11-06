import { NextResponse } from 'next/server'

export async function GET() {
  const hasGitHubConfig = !!(
    process.env.GITHUB_TOKEN &&
    process.env.GITHUB_OWNER &&
    process.env.GITHUB_REPO
  )

  return NextResponse.json({
    configured: hasGitHubConfig,
    owner: process.env.GITHUB_OWNER || null,
    repo: process.env.GITHUB_REPO || null,
    hasToken: !!process.env.GITHUB_TOKEN,
  })
}
