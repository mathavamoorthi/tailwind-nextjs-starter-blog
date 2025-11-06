import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
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

    try {
      // Upload to Vercel Blob Storage
      console.log(`🚀 Uploading image to Vercel Blob: ${filename}`)

      const blob = await put(filename, buffer, {
        access: 'public',
        addRandomSuffix: false,
      })

      console.log(`✅ Image uploaded to Vercel Blob successfully: ${blob.url}`)

      // Return the blob URL for immediate preview
      return NextResponse.json({
        ok: true,
        url: blob.url, // This will be the CDN URL for preview
        filename,
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        message:
          '✅ Image uploaded to Vercel Blob! It will be committed to GitHub when you publish the post.',
      })
    } catch (blobError) {
      console.error('Vercel Blob upload error:', blobError)
      return NextResponse.json(
        {
          error: 'Failed to upload image to Vercel Blob',
          details: blobError instanceof Error ? blobError.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (e) {
    console.error('Upload error:', e)
    return NextResponse.json({ error: 'upload failed' }, { status: 500 })
  }
}
