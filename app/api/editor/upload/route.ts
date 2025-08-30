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
      
      console.log('Successfully stored image in temp for preview:', filePath)
      
      // Return the FINAL GitHub path that will work after build
      // This ensures the MDX content is correct for production
      const finalImageUrl = `/static/images/${slug}/${filename}`
      
      // For preview, we'll serve from the temp location via API
      // For production, this will be the correct static file path
      const previewUrl = process.env.VERCEL 
        ? `/api/editor/image/${slug}/${filename}` // Temporary API endpoint for preview
        : finalImageUrl // Local development uses static files directly
      
      return NextResponse.json({ 
        ok: true, 
        url: finalImageUrl, // This is what gets inserted into MDX
        previewUrl: previewUrl, // This is for immediate preview
        filename,
        tempPath: filePath,
        message: '✅ Image uploaded for preview (will be committed to GitHub when you save the post)'
      })
    } catch (localError) {
      console.error('Local upload error:', localError)
      return NextResponse.json({ 
        error: 'Failed to upload image for preview.',
        details: process.env.VERCEL ? 'Running on Vercel with read-only filesystem' : 'Local filesystem write failed'
      }, { status: 500 })
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'upload failed' }, { status: 500 })
  }
}


