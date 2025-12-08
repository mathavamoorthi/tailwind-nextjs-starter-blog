import { sortPosts, allCoreContent } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import Main from './Main'

// Optional: ISR for home page
export const revalidate = 3600

export default async function Page() {
  // - non-draft posts
  // - posts that are NOT explicitly hidden from home
  const visibleBlogs = allBlogs.filter(
    (post) => post.draft !== true && post.showOnHome !== false
  )

  const sortedPosts = sortPosts(visibleBlogs)
  const posts = allCoreContent(sortedPosts)

  return <Main posts={posts} />
}
