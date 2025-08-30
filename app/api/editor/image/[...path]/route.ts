import { NextResponse } from 'next/server'
import { readFile, access } from 'fs/promises'
import path from 'path'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    
    if (!pathSegments || pathSegments.length < 2) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const slug = pathSegments[0]
    const filename = pathSegments[1]
    
    // Only allow access to images in /tmp for security
    const imagePath = path.join('/tmp', 'public', 'static', 'images', slug, filename)
    
    try {
      await access(imagePath)
    } catch {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const imageBuffer = await readFile(imagePath)
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase()
    let contentType = 'image/jpeg' // default
    
    if (ext === '.png') contentType = 'image/png'
    else if (ext === '.gif') contentType = 'image/gif'
    else if (ext === '.webp') contentType = 'image/webp'
    else if (ext === '.svg') contentType = 'image/svg+xml'

    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Image serving error:', error)
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 })
  }
}
