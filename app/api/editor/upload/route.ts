import { NextResponse } from 'next/server'
import path from 'path'
import { mkdir, writeFile, access } from 'fs/promises'

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

    const dir = path.join(process.cwd(), 'public', 'static', 'images', slug)
    try {
      await access(dir)
    } catch {
      await mkdir(dir, { recursive: true })
    }

    const filePath = path.join(dir, filename)
    await writeFile(filePath, buffer)

    const publicUrl = `/static/images/${slug}/${filename}`
    return NextResponse.json({ ok: true, url: publicUrl, filename })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'upload failed' }, { status: 500 })
  }
}


