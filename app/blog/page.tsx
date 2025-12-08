import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import { genPageMetadata } from 'app/seo'
import ListLayout from '@/layouts/ListLayoutWithTags'

const POSTS_PER_PAGE = 5

export const metadata = genPageMetadata({ title: 'Blog' })

// Enable ISR - revalidate every hour
export const revalidate = 3600

export default async function BlogPage(props: { searchParams: Promise<{ page: string }> }) {
  //  Filter out draft posts + posts hidden from homepage
  const visiblePosts = allBlogs.filter((post) => {
    return post.draft !== true && post.showOnHome !== false
  })

  const posts = allCoreContent(sortPosts(visiblePosts))

  const pageNumber = 1
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE)
  const initialDisplayPosts = posts.slice(0, POSTS_PER_PAGE * pageNumber)

  const pagination = {
    currentPage: pageNumber,
    totalPages: totalPages,
  }

  return (
    <ListLayout
      posts={posts}
      initialDisplayPosts={initialDisplayPosts}
      pagination={pagination}
      title="All Posts"
    />
  )
}

