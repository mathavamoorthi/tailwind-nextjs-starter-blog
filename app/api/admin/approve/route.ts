import { NextResponse } from 'next/server'
import path from 'path'
import { readFile, writeFile, mkdir, unlink } from 'fs/promises'
import { GitHubAPI } from '../../../../lib/github'
import { revalidatePath } from 'next/cache'

// Admin authentication check
function isAdmin(request: Request): boolean {
  const authHeader = request.headers.get('authorization') || ''
  const adminUsers = process.env.ADMIN_USERS || ''
  
  if (!adminUsers) return false
  
  const admins = adminUsers.split(',').map(u => u.trim())
  
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
      // Move draft to published blog
      try {
        // Ensure blog directory exists
        await mkdir(path.join(process.cwd(), 'data', 'blog'), { recursive: true })
        
        // Write to blog directory
        await writeFile(blogPath, draftContent, 'utf-8')
        
        // Delete the draft
        await unlink(draftPath)
        
        // Commit to GitHub if configured
        let githubResult = null
        if (process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
          try {
            const github = new GitHubAPI(
              process.env.GITHUB_TOKEN,
              process.env.GITHUB_OWNER,
              process.env.GITHUB_REPO
            )

            const commitMessage = `Publish approved post: ${slug}`
            const base64Content = Buffer.from(draftContent, 'utf-8').toString('base64')

            githubResult = await github.createOrUpdateFile(
              `data/blog/${slug}.mdx`,
              base64Content,
              commitMessage
            )
          } catch (error) {
            console.error('GitHub commit error:', error)
          }
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
          github: githubResult ? { committed: true } : null
        })

      } catch (error) {
        console.error('Error publishing post:', error)
        return NextResponse.json({ error: 'Failed to publish post' }, { status: 500 })
      }

    } else if (action === 'reject') {
      // Update draft status to rejected and add feedback
      const { data, content } = require('gray-matter')(draftContent)
      
      // Add rejection feedback to frontmatter
      const updatedData = {
        ...data,
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        feedback: feedback || 'Post rejected by admin'
      }

      // Reconstruct the file with updated frontmatter
      const updatedContent = `---\n${Object.entries(updatedData)
        .map(([key, value]) => `${key}: ${typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}`)
        .join('\n')}\n---\n\n${content}`

      // Write back to draft
      await writeFile(draftPath, updatedContent, 'utf-8')

      return NextResponse.json({
        success: true,
        message: 'Post rejected successfully'
      })
    }

  } catch (error) {
    console.error('Error processing approval:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
