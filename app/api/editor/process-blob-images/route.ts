import { NextResponse } from 'next/server'
import { GitHubAPI } from '../../../../lib/github'

interface ProcessRequest {
  mdxContent: string
  slug: string
}

interface ImageInfo {
  blobUrl: string
  filename: string
  localPath: string
}

export async function POST(request: Request) {
  try {
    const { mdxContent, slug }: ProcessRequest = await request.json()

    if (!mdxContent || !slug) {
      return NextResponse.json({ 
        error: 'mdxContent and slug are required' 
      }, { status: 400 })
    }

    // Check if GitHub is configured
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) {
      return NextResponse.json({ 
        error: 'GitHub not configured. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.',
        details: 'Images must be committed to GitHub to work in production'
      }, { status: 500 })
    }

    // Extract all image URLs from the MDX content
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    const images: ImageInfo[] = []
    let match

    while ((match = imageRegex.exec(mdxContent)) !== null) {
      const [, alt, url] = match
      
      // Check if this is a Vercel Blob URL
      if (url.includes('blob.vercel-storage.com') || url.includes('vercel-storage.com')) {
        const filename = url.split('/').pop() || `image-${Date.now()}.png`
        const localPath = `public/static/images/${slug}/${filename}`
        
        images.push({
          blobUrl: url,
          filename,
          localPath
        })
      }
    }

    if (images.length === 0) {
      return NextResponse.json({ 
        message: 'No Vercel Blob images found in MDX content',
        processedContent: mdxContent,
        images: []
      })
    }

    console.log(`🔍 Found ${images.length} Vercel Blob images to process`)

    // Create GitHub API instance
    console.log('🔧 GitHub Configuration:', {
      token: process.env.GITHUB_TOKEN ? '✅ Set' : '❌ Missing',
      owner: process.env.GITHUB_OWNER || '❌ Missing',
      repo: process.env.GITHUB_REPO || '❌ Missing'
    })
    
    const github = new GitHubAPI(
      process.env.GITHUB_TOKEN,
      process.env.GITHUB_OWNER,
      process.env.GITHUB_REPO
    )

    let processedContent = mdxContent
    const processedImages: string[] = []
    const failedImages: string[] = []

    // Process each image
    for (const image of images) {
      try {
        console.log(`📥 Downloading image from Blob: ${image.filename}`)
        
        // Download image from Blob URL
        console.log(`📥 Attempting to download: ${image.blobUrl}`)
        const response = await fetch(image.blobUrl)
        console.log(`📥 Download response: ${response.status} ${response.statusText}`)
        
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
        }
        
        const imageBuffer = await response.arrayBuffer()
        const base64Content = Buffer.from(imageBuffer).toString('base64')
        
        // Validate base64 content
        console.log(`📊 Image size: ${imageBuffer.byteLength} bytes`)
        console.log(`📊 Base64 length: ${base64Content.length} characters`)
        
        // Test if base64 is valid
        try {
          // Check for valid base64 characters
          if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Content)) {
            throw new Error('Invalid base64 characters detected')
          }
          
          // Test decoding
          const decoded = Buffer.from(base64Content, 'base64')
          console.log(`✅ Base64 validation passed - decoded size: ${decoded.length} bytes`)
        } catch (e) {
          console.error('❌ Base64 validation failed:', e)
          throw new Error('Invalid base64 content generated')
        }
        
        // Commit image to GitHub
        const commitMessage = `Add image for blog post: ${slug} - ${image.filename}`
        
        console.log(`📤 Committing image to GitHub: ${image.localPath}`)
        await github.createOrUpdateFile(
          image.localPath,
          base64Content,
          commitMessage
        )
        
        console.log(`✅ Image committed to GitHub: ${image.localPath}`)
        
        // Replace ALL occurrences of this Blob URL with local path in MDX content
        const localUrl = `/static/images/${slug}/${image.filename}`
        const beforeCount = (processedContent.match(new RegExp(image.blobUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
        processedContent = processedContent.replaceAll(image.blobUrl, localUrl)
        const afterCount = (processedContent.match(new RegExp(image.blobUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
        
        console.log(`🔄 Replaced ${beforeCount} occurrences of Blob URL with local path: ${localUrl}`)
        
        processedImages.push(image.filename)
        
      } catch (error) {
        console.error(`❌ Failed to process image ${image.filename}:`, error)
        failedImages.push(image.filename)
      }
    }
    
    // Final verification: ensure no Blob URLs remain
    const remainingBlobUrls = processedContent.match(/blob\.vercel-storage\.com|vercel-storage\.com/g)
    if (remainingBlobUrls && remainingBlobUrls.length > 0) {
      console.warn(`⚠️ Warning: ${remainingBlobUrls.length} Blob URLs still remain in processed content`)
    } else {
      console.log('✅ All Blob URLs successfully replaced with local paths')
    }

    return NextResponse.json({ 
      ok: true,
      message: `Processed ${processedImages.length} images successfully`,
      processedContent,
      images: {
        processed: processedImages,
        failed: failedImages,
        total: images.length
      },
      verification: {
        blobUrlsRemaining: remainingBlobUrls ? remainingBlobUrls.length : 0,
        allReplaced: !remainingBlobUrls || remainingBlobUrls.length === 0
      }
    })

  } catch (error) {
    console.error('Process blob images error:', error)
    return NextResponse.json({ 
      error: 'Failed to process blob images',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
