import { allBlogs } from 'contentlayer/generated'
import { authors } from '@/data/authors'
import Image from 'next/image'
import Link from '@/components/Link'
import { notFound } from 'next/navigation'
import { CoreContent } from 'pliny/utils/contentlayer'

export default function AuthorPage({ params }: { params: { slug: string } }) {
  const { slug } = params

  const author = authors.find((a) => a.slug === slug)
  if (!author) return notFound()

  const authorPosts = allBlogs.filter((post) => post.authors?.includes(author.name))
  const posts = authorPosts.map((p) => CoreContent(p))

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="h-28 w-28 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          {author.avatar ? (
            <Image
              src={author.avatar}
              alt={author.name}
              width={120}
              height={120}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-bold">
              {author.name[0]}
            </div>
          )}
        </div>

        <h1 className="mt-4 text-3xl font-bold">{author.name}</h1>
        {author.role && <p className="text-gray-600 dark:text-gray-300">{author.role}</p>}
      </div>

      {/* Posts */}
      <div className="space-y-8">
        {posts.length === 0 ? (
          <p className="text-center text-gray-500">No posts by this author yet.</p>
        ) : (
          posts.map((post) => (
            <div key={post.slug} className="rounded-lg border p-5 dark:border-gray-700">
              <h2 className="text-xl font-semibold">
                <Link href={`/${post.path}`}>{post.title}</Link>
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-300">{post.summary}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
