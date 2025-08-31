import { NextResponse } from 'next/server'
import { writeFile, mkdir, access } from 'fs/promises'
import path from 'path'
import { GitHubAPI } from '../../../../lib/github'
import { revalidatePath } from 'next/cache'

type RequestBody = {
  frontmatter: Record<string, unknown>
  body: string
  slug: string
}

function toArrayOrUndefined(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined
  if (Array.isArray(value)) return value.map(String)
  const s = String(value).trim()
  if (!s) return undefined
  return s
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

function buildFrontmatter(fm: Record<string, unknown>) {
  const fields: Record<string, unknown> = {}
  if (fm.title) fields.title = String(fm.title)
  if (fm.date) fields.date = String(fm.date)
  const lastmod = String(fm.lastmod || '').trim()
  if (lastmod) fields.lastmod = lastmod
  if (fm.draft !== undefined) fields.draft = Boolean(fm.draft)
  const summary = String(fm.summary || '').trim()
  if (summary) fields.summary = summary
  const tags = toArrayOrUndefined(fm.tags)
  if (tags) fields.tags = tags
  const authors = toArrayOrUndefined(fm.authors)
  if (authors) fields.authors = authors
  const images = toArrayOrUndefined(fm.images)
  if (images) fields.images = images
  const layout = String(fm.layout || '').trim()
  if (layout) fields.layout = layout
  const bibliography = String(fm.bibliography || '').trim()
  if (bibliography) fields.bibliography = bibliography
  const canonicalUrl = String(fm.canonicalUrl || '').trim()
  if (canonicalUrl) fields.canonicalUrl = canonicalUrl
  return fields
}

function serializeFrontmatter(obj: Record<string, unknown>) {
  const lines: string[] = ['---']
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      const arr = (value as unknown[]).map((v) => JSON.stringify(v)).join(', ')
      lines.push(`${key}: [${arr}]`)
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${key}: ${JSON.stringify(value)}`)
    } else if (typeof value === 'string') {
      const needsQuote = /[:#>-]/.test(value)
      lines.push(`${key}: ${needsQuote ? JSON.stringify(value) : value}`)
    } else {
      lines.push(`${key}: ${String(value)}`)
    }
  }
  lines.push('---')
  return lines.join('\n')
}

function getRequestAuthor(request: Request): string | null {
  const header = request.headers.get('x-editor-author')
  if (!header) return null
  return header.trim()
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody
    const { frontmatter, body: mdxBody, slug } = body

    if (!frontmatter || !frontmatter.title || !frontmatter.date) {
      return NextResponse.json({ error: 'title and date are required' }, { status: 400 })
    }
    if (!slug || /[^a-z0-9-]/.test(slug)) {
      return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
    }

    const filename = `${slug}.mdx`
    const fm = buildFrontmatter(frontmatter)
    const actorAuthor = getRequestAuthor(request)
    if (actorAuthor) {
      // Force authors to be the authenticated author only
      fm.authors = [actorAuthor]
    }
    const fmText = serializeFrontmatter(fm)
    const content = `${fmText}\n\n${mdxBody || ''}\n`

    // Process Vercel Blob images before saving
    let processedContent = content
    let imageProcessingResult: any = null
    
    try {
      // Check if there are any Vercel Blob URLs in the content
      if (content.includes('blob.vercel-storage.com') || content.includes('vercel-storage.com')) {
        console.log('🔄 Processing Vercel Blob images...')
        
        const processResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/editor/process-blob-images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mdxContent: content,
            slug: slug
          }),
        })
        
        if (processResponse.ok) {
          const processData = await processResponse.json()
          processedContent = processData.processedContent
          imageProcessingResult = processData.images
          console.log(`✅ Processed ${processData.images.processed.length} images successfully`)
        } else {
          console.warn('⚠️ Failed to process blob images, continuing with original content')
        }
      }
    } catch (processError) {
      console.error('Image processing error:', processError)
      // Continue with original content if processing fails
    }

    // In production (Vercel), we can't write to the filesystem
    // So we only write to GitHub and rely on the build process
    let githubResult = null
    let localWriteSuccess = false

    // Try to write to GitHub first (this is the primary method)
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
      try {
        const github = new GitHubAPI(
          process.env.GITHUB_TOKEN,
          process.env.GITHUB_OWNER,
          process.env.GITHUB_REPO
        )
        
        const commitMessage = `Add/Update blog post: ${frontmatter.title}`
        githubResult = await github.createOrUpdateFile(
          `data/blog/${filename}`,
          processedContent, // Use processedContent for GitHub
          commitMessage
        )
        
        if (githubResult) {
          console.log('Successfully committed to GitHub:', filename)
        }
      } catch (error) {
        console.error('GitHub push error:', error)
        // If GitHub fails, we'll try local write as fallback
      }
    }

    // Fallback: Try to write locally (for development or if GitHub fails)
    if (!githubResult) {
      try {
        // Use /tmp for Vercel or current working directory for local development
        const baseDir = process.env.VERCEL ? '/tmp' : process.cwd()
        const dir = path.join(baseDir, 'data', 'blog')
        
        try {
          await access(dir)
        } catch {
          await mkdir(dir, { recursive: true })
        }

        const filePath = path.join(dir, filename)
        await writeFile(filePath, processedContent, 'utf-8') // Use processedContent for local write
        localWriteSuccess = true
        console.log('Successfully wrote locally:', filePath)
      } catch (localError) {
        console.error('Local write error:', localError)
        
        // If both GitHub and local write fail, return error
        if (!githubResult) {
          return NextResponse.json({ 
            error: 'Failed to save blog post. GitHub push failed and local write not permitted.',
            details: process.env.VERCEL ? 'Running on Vercel with read-only filesystem' : 'Local filesystem write failed'
          }, { status: 500 })
        }
      }
    }

    // Revalidate blog pages to show new content
    try {
      revalidatePath('/blog')
      revalidatePath('/blog/[page]', 'page')
      revalidatePath('/tags')
      revalidatePath('/tags/[tag]', 'page')
      revalidatePath('/tags/[tag]/page/[page]', 'page')
    } catch (error) {
      console.error('Revalidation error:', error)
    }

    // Trigger Vercel redeployment to make images visible
    if (process.env.VERCEL_DEPLOY_HOOK && githubResult) {
      try {
        const webhookUrl = process.env.VERCEL_DEPLOY_HOOK
        console.log('🚀 Triggering Vercel redeployment via webhook...')
        
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ref: 'main',
            repository: {
              name: process.env.GITHUB_REPO,
              owner: process.env.GITHUB_OWNER,
            },
            commits: [{
              id: (githubResult as any).commit?.sha || 'unknown',
              message: `Update blog post: ${slug}`,
              timestamp: new Date().toISOString(),
            }],
          }),
        })
        
        if (webhookResponse.ok) {
          console.log('✅ Vercel redeployment triggered successfully')
        } else {
          console.warn('⚠️ Vercel webhook call failed:', webhookResponse.status)
        }
      } catch (webhookError) {
        console.error('Vercel webhook error:', webhookError)
        // Don't fail the save operation if webhook fails
      }
    }

    return NextResponse.json({ 
      ok: true, 
      path: `data/blog/${filename}`,
      github: githubResult ? { committed: true, sha: (githubResult as any).commit?.sha } : null,
      local: localWriteSuccess,
      images: imageProcessingResult,
      message: githubResult 
        ? imageProcessingResult && imageProcessingResult.processed && imageProcessingResult.processed.length > 0
          ? `Blog post committed to GitHub successfully! ${imageProcessingResult.processed.length} images processed and committed. Vercel redeployment triggered.`
          : 'Blog post committed to GitHub successfully! Vercel redeployment triggered.'
        : localWriteSuccess 
          ? 'Blog post saved locally (GitHub not configured)' 
          : 'Blog post saved'
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
