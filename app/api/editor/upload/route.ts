import { NextResponse } from 'next/server'
import path from 'path'
import { mkdir, writeFile, access, readdir, unlink } from 'fs/promises'
import { GitHubAPI } from '../../../../lib/github'

function isValidSlug(slug: string) {
  return /^[a-z0-9-]+$/.test(slug)
}

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const slug = String(form.get('slug') || '')
    const file = form.get('file') as unknown as File | null

    if (!slug || !isValidSlug(slug)) {
      return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
    }
    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    const arrayBuffer = await (file as unknown as Blob).arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const safeName = String((file as unknown as File).name || 'image')
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
    const timestamp = Date.now()
    const filename = `${timestamp}-${safeName}`

    let tempStored = false
    let githubCommitted = false
    let githubError = null

    // Stage 1: Store image in /tmp for immediate preview
    try {
      const baseDir = process.env.VERCEL ? '/tmp' : process.cwd()
      const dir = path.join(baseDir, 'public', 'static', 'images', slug)
      
      try {
        await access(dir)
      } catch {
        await mkdir(dir, { recursive: true })
      }

      const filePath = path.join(dir, filename)
      await writeFile(filePath, buffer)
      tempStored = true
      
      console.log('Successfully stored image in temp for preview:', filePath)
    } catch (localError) {
      console.error('Local upload error:', localError)
      return NextResponse.json({ 
        error: 'Failed to upload image for preview.',
        details: process.env.VERCEL ? 'Running on Vercel with read-only filesystem' : 'Local filesystem write failed'
      }, { status: 500 })
    }

    // Stage 2: Commit to GitHub immediately (if configured)
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
      try {
        const github = new GitHubAPI(
          process.env.GITHUB_TOKEN,
          process.env.GITHUB_OWNER,
          process.env.GITHUB_REPO
        )
        
        // Convert buffer to base64 for GitHub API
        const base64Content = buffer.toString('base64')
        const commitMessage = `Add image for blog post: ${slug} - ${filename}`
        
        await github.createOrUpdateFile(
          `public/static/images/${slug}/${filename}`,
          base64Content,
          commitMessage
        )
        
        githubCommitted = true
        console.log('Successfully committed image to GitHub:', filename)
        
        // If GitHub commit succeeded, we can optionally remove the temp file
        // since it's now permanently stored in GitHub
        if (tempStored && process.env.VERCEL) {
          try {
            const tempPath = path.join('/tmp', 'public', 'static', 'images', slug, filename)
            await unlink(tempPath)
            console.log('Cleaned up temp file after GitHub commit:', tempPath)
          } catch (cleanupError) {
            console.warn('Failed to clean up temp file:', cleanupError)
          }
        }
        
      } catch (error) {
        console.error('GitHub upload error:', error)
        githubError = error
        // Don't fail the upload - temp file is still available for preview
      }
    }

    // Return appropriate response based on what succeeded
    if (tempStored) {
      let publicUrl = ''
      let message = ''
      
      if (githubCommitted) {
        // Image is in both temp and GitHub - use permanent URL
        publicUrl = `/static/images/${slug}/${filename}`
        message = '✅ Image uploaded and committed to GitHub successfully'
      } else if (githubError) {
        // Image in temp only, GitHub failed - use temp URL
        publicUrl = process.env.VERCEL 
          ? `/api/editor/image/${slug}/${filename}` // Temporary API endpoint
          : `/static/images/${slug}/${filename}` // Local development
        message = '⚠️ Image uploaded for preview (GitHub commit failed - will retry on save)'
      } else {
        // No GitHub configured - use appropriate URL
        publicUrl = process.env.VERCEL 
          ? `/api/editor/image/${slug}/${filename}` // Temporary API endpoint
          : `/static/images/${slug}/${filename}` // Local development
        message = '✅ Image uploaded for preview (GitHub not configured)'
      }
      
      return NextResponse.json({ 
        ok: true, 
        url: publicUrl, 
        filename,
        tempStored,
        githubCommitted,
        githubError: githubError ? (githubError as Error).message : null,
        message
      })
    }

    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'upload failed' }, { status: 500 })
  }
}


