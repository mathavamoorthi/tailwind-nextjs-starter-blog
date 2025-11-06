import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-hub-signature-256')

    // Verify GitHub webhook signature
    if (process.env.GITHUB_WEBHOOK_SECRET) {
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
        .update(body)
        .digest('hex')}`

      if (signature !== expectedSignature) {
        return NextResponse.json({ message: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)

    // Only revalidate on push to main branch
    if (payload.ref === 'refs/heads/main' && payload.commits) {
      const changedFiles = payload.commits.flatMap((commit: unknown) => [
        ...(commit.added || []),
        ...(commit.modified || []),
        ...(commit.removed || []),
      ])

      // Check if blog content changed
      const hasBlogChanges = changedFiles.some(
        (file: string) => file.startsWith('data/blog/') || file.startsWith('data/authors/')
      )

      if (hasBlogChanges) {
        // Revalidate all blog-related pages
        revalidatePath('/blog')
        revalidatePath('/blog/[page]', 'page')
        revalidatePath('/tags')
        revalidatePath('/tags/[tag]', 'page')
        revalidatePath('/tags/[tag]/page/[page]', 'page')

        return NextResponse.json({
          revalidated: true,
          message: 'Blog pages revalidated',
          changedFiles,
        })
      }
    }

    return NextResponse.json({ message: 'No revalidation needed' })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
