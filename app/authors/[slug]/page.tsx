import { notFound } from 'next/navigation'
import { allBlogs } from 'contentlayer/generated'
import { allCoreContent } from 'pliny/utils/contentlayer' // ✅ use allCoreContent
import ListLayout from '@/layouts/ListLayout'
import { authors } from '@/data/authors'

export function generateStaticParams() {
  return authors.map((a) => ({ slug: a.slug }))
}

export default function AuthorPage({ params }: { params: { slug: string } }) {
  const author = authors.find((a) => a.slug === params.slug)
  if (!author) return notFound()

  const authorPosts = allBlogs
    .filter((post) => !post.draft)
    .filter((post) => (post.authors || []).includes(author.name))

  // ❌ const corePosts = authorPosts.map((post) => CoreContent(post))
  // ✅ correct:
  const corePosts = allCoreContent(authorPosts)

  return (
    <div className="py-8">
      {/* author header */}
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="mb-4 h-28 w-28 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          {author.avatar && (
            <img
              src={author.avatar}
              alt={author.name}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
          {author.name}
        </h1>
        {author.role && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{author.role}</p>
        )}

        <div className="mt-4 flex items-center gap-4 text-gray-500 dark:text-gray-400">
          {author.email && <a href={author.email}>✉️</a>}
          {author.linkedin && <a href={author.linkedin}>in</a>}
        </div>
      </div>

      {/* posts list */}
      {corePosts.length === 0 ? (
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          No posts by {author.name}.
        </p>
      ) : (
        <ListLayout
          posts={corePosts}
          title={`Posts by ${author.name}`}
          initialDisplayPosts={corePosts}
        />
      )}
    </div>
  )
}
