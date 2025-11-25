import { NextResponse } from 'next/server'
import { writeFile, mkdir, access } from 'fs/promises'
import path from 'path'
import { GitHubAPI } from '../../../../lib/github'
import { revalidatePath } from 'next/cache'

type RequestBody = {
  frontmatter: Record<string, unknown>
  body: string
  slug: string
  mode?: 'draft' | 'submit' // Save Draft vs Submit for Review
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
    const { frontmatter, body: mdxBody, slug, mode } = body

    if (!frontmatter || !frontmatter.title || !frontmatter.date) {
      return NextResponse.json({ error: 'title and date are required' }, { status: 400 })
    }
    if (!slug || /[^a-z0-9-]/.test(slug)) {
      return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
    }

    const isSubmit = mode === 'submit'
    const filename = `${slug}.mdx`
    const fm = buildFrontmatter(frontmatter)

    const actorAuthor = getRequestAuthor(request)
    if (actorAuthor) {
      // Force authors to be the authenticated author only
      fm.authors = [actorAuthor]
    }

    // Status + draft flag
    const desiredStatus = isSubmit ? 'pending_review' : 'draft'
    ;(fm as any).status = desiredStatus
    ;(fm as any).draft = !isSubmit

    // Timestamps – preserve existing createdAt if present
    const now = new Date().toISOString()
    const existingCreatedAt =
      (frontmatter as any)?.createdAt && typeof (frontmatter as any).createdAt === 'string'
        ? (frontmatter as any).createdAt
        : undefined

    ;(fm as any).createdAt = existingCreatedAt || now
    ;(fm as any).updatedAt = now

    const fmText = serializeFrontmatter(fm)
    const content = `${fmText}\n\n${mdxBody || ''}\n`

    // Process Vercel Blob images before saving
    let processedContent = content
    let imageProcessingResult: any = null

    try {
      if (content.includes('blob.vercel-storage.com') || content.includes('vercel-storage.com')) {
        console.log('🔄 Processing Vercel Blob images...')

        if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) {
          console.warn('⚠️ GitHub not configured - skipping blob image processing')
        } else {
          const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
          const images: Array<{ blobUrl: string; filename: string; localPath: string }> = []
          let match

          while ((match = imageRegex.exec(content)) !== null) {
            const [, , url] = match

            if (url.includes('blob.vercel-storage.com') || url.includes('vercel-storage.com')) {
              const filename = url.split('/').pop() || `image-${Date.now()}.png`
              const localPath = `public/static/images/${slug}/${filename}`

              images.push({
                blobUrl: url,
                filename,
                localPath,
              })
            }
          }

          if (images.length > 0) {
            console.log(`🔍 Found ${images.length} Vercel Blob images to process`)

            const github = new GitHubAPI(
              process.env.GITHUB_TOKEN,
              process.env.GITHUB_OWNER,
              process.env.GITHUB_REPO
            )

            const processedImages: string[] = []
            const failedImages: string[] = []

            for (const image of images) {
              try {
                console.log(`📥 Processing image: ${image.filename}`)

                const response = await fetch(image.blobUrl)
                if (!response.ok) {
                  throw new Error(
                    `Failed to download image: ${response.status} ${response.statusText}`
                  )
                }

                const imageBuffer = await response.arrayBuffer()
                const base64Content = Buffer.from(imageBuffer).toString('base64')

                console.log(`📊 Image size: ${imageBuffer.byteLength} bytes`)

                const commitMessage = `Add image for blog post: ${slug} - ${image.filename}`

                await github.createOrUpdateFile(image.localPath, base64Content, commitMessage)

                console.log(`✅ Image committed to GitHub: ${image.localPath}`)

                const localUrl = `/static/images/${slug}/${image.filename}`
                processedContent = processedContent.replaceAll(image.blobUrl, localUrl)

                console.log(`🔄 Replaced Blob URL with local path: ${localUrl}`)

                processedImages.push(image.filename)
              } catch (error) {
                console.error(`❌ Failed to process image ${image.filename}:`, error)
                failedImages.push(image.filename)
              }
            }

            const remainingBlobUrls = processedContent.match(
              /blob\.vercel-storage\.com|vercel-storage\.com/g
            )
            if (remainingBlobUrls && remainingBlobUrls.length > 0) {
              console.warn(
                `⚠️ Warning: ${remainingBlobUrls.length} Blob URLs still remain in processed content`
              )
            } else {
              console.log('✅ All Blob URLs successfully replaced with local paths')
            }

            imageProcessingResult = {
              processed: processedImages,
              failed: failedImages,
              total: images.length,
            }
          } else {
            console.log('ℹ️ No Vercel Blob images found in MDX content')
          }
        }
      }
    } catch (processError) {
      console.error('Image processing error:', processError)
    }

    // GitHub first
    let githubResult = null
    let localWriteSuccess = false

    if (process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
      try {
        const github = new GitHubAPI(
          process.env.GITHUB_TOKEN,
          process.env.GITHUB_OWNER,
          process.env.GITHUB_REPO
        )

        const commitMessage = isSubmit
          ? `Submit post for review: ${frontmatter.title}`
          : `Save draft post: ${frontmatter.title}`

        const base64Content = Buffer.from(processedContent, 'utf-8').toString('base64')

        console.log(`📄 MDX Content length: ${processedContent.length} characters`)
        console.log(`📄 Base64 Content length: ${base64Content.length} characters`)

        githubResult = await github.createOrUpdateFile(
          `data/drafts/${filename}`,
          base64Content,
          commitMessage
        )

        if (githubResult) {
          console.log('Successfully committed to GitHub:', filename)
        }
      } catch (error) {
        console.error('GitHub push error:', error)
      }
    }

    // Local fallback
    if (!githubResult) {
      try {
        const baseDir = process.env.VERCEL ? '/tmp' : process.cwd()
        const dir = path.join(baseDir, 'data', 'drafts')

        try {
          await access(dir)
        } catch {
          await mkdir(dir, { recursive: true })
        }

        const filePath = path.join(dir, filename)
        await writeFile(filePath, processedContent, 'utf-8')
        localWriteSuccess = true
        console.log('Successfully wrote locally:', filePath)
      } catch (localError) {
        console.error('Local write error:', localError)

        if (!githubResult) {
          return NextResponse.json(
            {
              error: 'Failed to save MDX file',
              details: localError instanceof Error ? localError.message : 'Unknown error',
            },
            { status: 500 }
          )
        }
      }
    }

    // Revalidate blog-related paths (safe even though drafts aren't visible yet)
    try {
      revalidatePath('/blog')
      revalidatePath('/blog/[page]', 'page')
      revalidatePath('/tags')
      revalidatePath('/tags/[tag]', 'page')
      revalidatePath('/tags/[tag]/page/[page]', 'page')
    } catch (error) {
      console.error('Revalidation error:', error)
    }

    const baseMessageImages =
      imageProcessingResult &&
      imageProcessingResult.processed &&
      imageProcessingResult.processed.length > 0
        ? `${imageProcessingResult.processed.length} images processed.`
        : ''

    const actionText = isSubmit ? 'Submitted for review.' : 'Draft saved.'

    return NextResponse.json({
      ok: true,
      path: `data/drafts/${filename}`,
      github: githubResult ? { committed: true, sha: (githubResult as any).commit?.sha } : null,
      local: localWriteSuccess,
      images: imageProcessingResult,
      message: githubResult
        ? `${actionText} ${baseMessageImages}`.trim()
        : localWriteSuccess
        ? isSubmit
          ? 'Submitted for review locally (GitHub not configured).'
          : 'Draft saved locally (GitHub not configured).'
        : 'Draft saved',
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
