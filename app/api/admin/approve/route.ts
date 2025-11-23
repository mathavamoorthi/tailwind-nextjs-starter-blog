/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import path from 'path'
import { readFile, writeFile, mkdir, unlink } from 'fs/promises'
import { GitHubAPI } from '../../../../lib/github'
import { revalidatePath } from 'next/cache'
import matter from 'gray-matter'
import { allAuthors } from 'contentlayer/generated'

// ---------------- Admin authentication ----------------

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

// ---------------- Helpers: author -> discordId ----------------

function getPrimaryAuthorSlug(frontmatter: any): string | null {
  const authorsField = frontmatter.authors ?? frontmatter.author
  if (!authorsField) return null

  if (Array.isArray(authorsField)) {
    return authorsField[0] ?? null
  }

  if (typeof authorsField === 'string') {
    return authorsField
  }

  return null
}

function getAuthorDiscordIdFromFrontmatter(frontmatter: any): string | null {
  const authorSlug = getPrimaryAuthorSlug(frontmatter)
  if (!authorSlug) return null

  const authorDoc: any =
    allAuthors.find((a: any) => a.slug === authorSlug) ||
    allAuthors.find((a: any) => a.slug === `authors/${authorSlug}`) ||
    allAuthors.find((a: any) => a._raw?.flattenedPath === authorSlug)

  if (!authorDoc || !authorDoc.discordId) return null
  return String(authorDoc.discordId)
}

// ---------------- Helper: call Novyy bot on reject ----------------

async function notifyDiscordReject(frontmatter: any, slug: string) {
  try {
    const NOVYY_BOT_URL = process.env.NOVYY_BOT_URL
    const INTERNAL_SECRET = process.env.INTERNAL_SECRET

    if (!NOVYY_BOT_URL || !INTERNAL_SECRET) {
      console.warn('NOVYY_BOT_URL or INTERNAL_SECRET not configured; skipping Discord notification')
      return
    }

    const discordId = getAuthorDiscordIdFromFrontmatter(frontmatter)
    if (!discordId) {
      console.warn('No discordId found for author; skipping Discord notification')
      return
    }

    const postTitle = frontmatter.title || slug
    const reason = frontmatter.feedback || 'Post rejected by admin'
    const postUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/blog/${slug}`
      : undefined

    // Use NOVYY_BOT_URL as full endpoint (e.g. https://novyy.n0va.in/blog-rejected)
    await fetch(NOVYY_BOT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SECRET,
      },
      body: JSON.stringify({
        authorDiscordId: discordId,
        postTitle,
        reason,
        postUrl,
      }),
    })
  } catch (err) {
    console.error('Failed to send Discord rejection notification:', err)
    // Do NOT break the main rejection flow if Discord fails
  }
}

// ---------------- Main handler ----------------

export async function POST(request: Request) {
  try {
    // Check admin authentication
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const { slug, action, feedback } = body // action: 'approve' | 'reject'

    if (!slug || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const draftPath = path.join(process.cwd(), 'data', 'drafts', `${slug}.mdx`)
    const blogPath = path.join(process.cwd(), 'data', 'blog', `${slug}.mdx`)

    // Read the draft file
    let draftContent: string
    try {
      draftContent = await readFile(draftPath, 'utf-8')
    } catch (error) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    if (action === 'approve') {
      try {
        // Parse the draft content to modify frontmatter
        const { data, content } = matter(draftContent)

        // Update frontmatter for published post
        const updatedData = {
          ...data,
          draft: false,
          status: 'published',
          publishedAt: new Date().toISOString(),
          approvedBy: 'admin',
        }

        // Reconstruct the file with updated frontmatter
        const updatedContent = `---\n${Object.entries(updatedData)
          .map(([key, value]) => {
            if (typeof value === 'string') {
              return `${key}: "${value}"`
            } else if (typeof value === 'boolean') {
              return `${key}: ${value}`
            } else {
              return `${key}: ${JSON.stringify(value)}`
            }
          })
          .join('\n')}\n---\n\n${content}`

        const isProduction =
          process.env.NODE_ENV === 'production' ||
          process.env.VERCEL_ENV === 'production' ||
          process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'

        let githubResult: any = null
        let localWriteSuccess = false

        // Local dev: write to filesystem
        if (!isProduction) {
          try {
            await mkdir(path.join(process.cwd(), 'data', 'blog'), { recursive: true })
            await writeFile(blogPath, updatedContent, 'utf-8')
            await unlink(draftPath)
            localWriteSuccess = true
            console.log('Successfully wrote file locally')
          } catch (localError) {
            console.error('Local file write failed:', localError)
          }
        }

        // Production (and fallback): commit to GitHub
        if (process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
          try {
            const github = new GitHubAPI(
              process.env.GITHUB_TOKEN,
              process.env.GITHUB_OWNER,
              process.env.GITHUB_REPO
            )

            const commitMessage = `Publish approved post: ${slug}`
            const base64Content = Buffer.from(updatedContent, 'utf-8').toString('base64')

            githubResult = await github.createOrUpdateFile(
              `data/blog/${slug}.mdx`,
              base64Content,
              commitMessage
            )

            try {
              await github.deleteFile(`data/drafts/${slug}.mdx`, `Remove approved draft: ${slug}`)
            } catch (deleteError) {
              console.error('Failed to delete draft from GitHub:', deleteError)
            }

            console.log('Successfully committed to GitHub')
          } catch (githubError) {
            console.error('GitHub commit error:', githubError)

            if (isProduction) {
              throw new Error('Failed to publish to GitHub in production environment')
            }
          }
        } else if (isProduction) {
          throw new Error('GitHub configuration required for production deployment')
        }

        // Revalidate pages
        try {
          revalidatePath('/blog')
          revalidatePath('/blog/[page]', 'page')
          revalidatePath('/tags')
          revalidatePath('/tags/[tag]', 'page')
          revalidatePath('/tags/[tag]/page/[page]', 'page')
        } catch (error) {
          console.error('Revalidation error:', error)
        }

        return NextResponse.json({
          success: true,
          message: 'Post approved and published successfully',
          github: githubResult ? { committed: true } : null,
          local: localWriteSuccess,
          environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
        })
      } catch (error) {
        console.error('Error publishing post:', error)
        return NextResponse.json(
          {
            error: 'Failed to publish post',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        )
      }
    } else if (action === 'reject') {
      // Parse draft so we can modify frontmatter
      const { data, content } = matter(draftContent)

      // Add rejection feedback to frontmatter
      const updatedData = {
        ...data,
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        feedback: feedback || 'Post rejected by admin',
      }

      // Reconstruct the file with updated frontmatter
      const updatedContent = `---\n${Object.entries(updatedData)
        .map(([key, value]) => {
          if (typeof value === 'string') {
            return `${key}: "${value}"`
          } else if (typeof value === 'boolean') {
            return `${key}: ${value}`
          } else {
            return `${key}: ${JSON.stringify(value)}`
          }
        })
        .join('\n')}\n---\n\n${content}`

      // Handle write depending on environment (Vercel FS is read-only)
      const isProduction =
        process.env.NODE_ENV === 'production' ||
        process.env.VERCEL_ENV === 'production' ||
        process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'

      if (
        isProduction &&
        process.env.GITHUB_TOKEN &&
        process.env.GITHUB_OWNER &&
        process.env.GITHUB_REPO
      ) {
        // In production: update the draft via GitHub API
        const github = new GitHubAPI(
          process.env.GITHUB_TOKEN,
          process.env.GITHUB_OWNER,
          process.env.GITHUB_REPO
        )

        const base64Content = Buffer.from(updatedContent, 'utf-8').toString('base64')

        await github.createOrUpdateFile(
          `data/drafts/${slug}.mdx`,
          base64Content,
          `Mark draft as rejected: ${slug}`
        )
      } else {
        // In local dev: write to filesystem normally
        await writeFile(draftPath, updatedContent, 'utf-8')
      }

      // Notify Novyy bot to DM the author on Discord
      await notifyDiscordReject(updatedData, slug)

      return NextResponse.json({
        success: true,
        message: 'Post rejected successfully',
      })
    }
  } catch (error) {
    console.error('Error processing approval:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
