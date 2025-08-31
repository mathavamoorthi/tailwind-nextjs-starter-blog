import { NextResponse } from 'next/server'
import path from 'path'
import { readFile, writeFile, mkdir, unlink } from 'fs/promises'
import { GitHubAPI } from '../../../../lib/github'
import { revalidatePath } from 'next/cache'
import matter from 'gray-matter'

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
      try {
        // Parse the draft content to modify frontmatter
        const { data, content } = matter(draftContent)
        
        // Update frontmatter for published post
        const updatedData = {
          ...data,
          draft: false, // Set draft to false when approved
          status: 'published',
          publishedAt: new Date().toISOString(),
          approvedBy: 'admin' // You can get this from the request if needed
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

        // Check if we're in a production environment (read-only file system)
        const isProduction = process.env.NODE_ENV === 'production' || 
                           process.env.VERCEL_ENV === 'production' ||
                           process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'

        let githubResult = null
        let localWriteSuccess = false

        // Try to write locally first (for development)
        if (!isProduction) {
          try {
            // Ensure blog directory exists
            await mkdir(path.join(process.cwd(), 'data', 'blog'), { recursive: true })
            
            // Write to blog directory
            await writeFile(blogPath, updatedContent, 'utf-8')
            
            // Delete the draft
            await unlink(draftPath)
            
            localWriteSuccess = true
            console.log('Successfully wrote file locally')
          } catch (localError) {
            console.error('Local file write failed:', localError)
            // Continue to GitHub commit as fallback
          }
        }

        // Commit to GitHub (primary method for production, fallback for development)
        if (process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
          try {
            const github = new GitHubAPI(
              process.env.GITHUB_TOKEN,
              process.env.GITHUB_OWNER,
              process.env.GITHUB_REPO
            )

            const commitMessage = `Publish approved post: ${slug}`
            const base64Content = Buffer.from(updatedContent, 'utf-8').toString('base64')

            // Create the blog post in GitHub
            githubResult = await github.createOrUpdateFile(
              `data/blog/${slug}.mdx`,
              base64Content,
              commitMessage
            )

            // Also delete the draft from GitHub
            try {
              await github.deleteFile(
                `data/drafts/${slug}.mdx`,
                `Remove approved draft: ${slug}`
              )
            } catch (deleteError) {
              console.error('Failed to delete draft from GitHub:', deleteError)
              // Don't fail the operation if draft deletion fails
            }

            console.log('Successfully committed to GitHub')
          } catch (githubError) {
            console.error('GitHub commit error:', githubError)
            
            // If we're in production and GitHub failed, this is a problem
            if (isProduction) {
              throw new Error('Failed to publish to GitHub in production environment')
            }
          }
        } else if (isProduction) {
          // In production, GitHub is required
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
          environment: isProduction ? 'production' : 'development'
        })

      } catch (error) {
        console.error('Error publishing post:', error)
        return NextResponse.json({ 
          error: 'Failed to publish post',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }

    } else if (action === 'reject') {
      // Update draft status to rejected and add feedback
      const { data, content } = matter(draftContent)
      
      // Add rejection feedback to frontmatter
      const updatedData = {
        ...data,
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        feedback: feedback || 'Post rejected by admin'
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
