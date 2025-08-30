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
      
      // Return temporary URL for immediate preview
      const publicUrl = process.env.VERCEL 
        ? `/api/editor/image/${slug}/${filename}` // Temporary API endpoint
        : `/static/images/${slug}/${filename}` // Local development
      
      return NextResponse.json({ 
        ok: true, 
        url: publicUrl, 
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


