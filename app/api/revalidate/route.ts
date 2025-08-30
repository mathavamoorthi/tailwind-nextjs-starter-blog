import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, tag, secret } = body

    // Check for secret to confirm this is a valid request
    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ message: 'Invalid secret' }, { status: 401 })
    }

    if (path) {
      // Handle dynamic routes with proper type parameter
      if (path.includes('[') && path.includes(']')) {
        revalidatePath(path, 'page')
      } else {
        revalidatePath(path)
      }
      return NextResponse.json({ revalidated: true, now: Date.now(), path })
    }

    if (tag) {
      revalidateTag(tag)
      return NextResponse.json({ revalidated: true, now: Date.now(), tag })
    }

    return NextResponse.json({ message: 'Missing path or tag' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 })
  }
}
