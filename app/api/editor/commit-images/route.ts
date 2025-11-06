import { NextResponse } from 'next/server'
import { readFile, access, readdir, unlink } from 'fs/promises'
import path from 'path'
import { GitHubAPI } from '../../../../lib/github'

export async function POST(request: Request) {
  try {
    const { slug } = await request.json()

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 })
    }

    // Check if GitHub is configured
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) {
      return NextResponse.json(
        {
          error: 'GitHub not configured',
          message: 'Images will remain in temporary storage',
        },
        { status: 400 }
      )
    }

    const github = new GitHubAPI(
      process.env.GITHUB_TOKEN,
      process.env.GITHUB_OWNER,
      process.env.GITHUB_REPO
    )

    const baseDir = process.env.VERCEL ? '/tmp' : process.cwd()
    const tempImageDir = path.join(baseDir, 'public', 'static', 'images', slug)

    const committedImages: string[] = []
    const failedImages: string[] = []

    try {
      // Check if temp directory exists
      await access(tempImageDir)

      // Read all files in the temp directory
      const files = await readdir(tempImageDir)

      // Filter for image files
      const imageFiles = files.filter((file) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file))

      if (imageFiles.length === 0) {
        return NextResponse.json({
          message: 'No images to commit',
          committed: [],
          failed: [],
        })
      }

      // Commit each image to GitHub
      for (const filename of imageFiles) {
        try {
          const imagePath = path.join(tempImageDir, filename)
          const imageBuffer = await readFile(imagePath)
          const base64Content = imageBuffer.toString('base64')

          const commitMessage = `Add image for blog post: ${slug} - ${filename}`

          await github.createOrUpdateFile(
            `public/static/images/${slug}/${filename}`,
            base64Content,
            commitMessage
          )

          committedImages.push(filename)
          console.log(`Successfully committed image to GitHub: ${filename}`)

          // Optionally clean up temp file after successful commit
          try {
            await unlink(imagePath)
            console.log(`Cleaned up temp file: ${imagePath}`)
          } catch (cleanupError) {
            console.warn(`Failed to clean up temp file: ${imagePath}`, cleanupError)
          }
        } catch (error) {
          console.error(`Failed to commit image ${filename}:`, error)
          failedImages.push(filename)
        }
      }

      return NextResponse.json({
        message: `Committed ${committedImages.length} images to GitHub`,
        committed: committedImages,
        failed: failedImages,
        total: imageFiles.length,
      })
    } catch (error) {
      console.error('Error accessing temp image directory:', error)
      return NextResponse.json(
        {
          error: 'No temporary images found',
          committed: [],
          failed: [],
        },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Commit images error:', error)
    return NextResponse.json({ error: 'Failed to commit images' }, { status: 500 })
  }
}
