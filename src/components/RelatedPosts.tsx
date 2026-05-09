import Link from "next/link";
import { format } from "date-fns";
import { getRelatedPosts } from "@/lib/posts";

interface RelatedPostsProps {
  currentSlug: string;
}

export default function RelatedPosts({ currentSlug }: RelatedPostsProps) {
  const related = getRelatedPosts(currentSlug, 3);

  if (related.length === 0) return null;

  return (
    <aside className="max-w-3xl mx-auto px-6 py-8">
      <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white font-blog tracking-tight mb-6">
          Related posts
        </h2>
        <div className="space-y-6">
          {related.map((post) => (
            <article key={post.slug}>
              <div className="flex items-center gap-2 text-12 mb-2 text-metadata font-bold tracking-wide">
                <time dateTime={post.date}>
                  {format(new Date(post.date), "MMM d, yyyy").toUpperCase()}
                </time>
                <span>•</span>
                <span>{post.readingTime} MIN READ</span>
              </div>
              <h3 className="text-xl font-bold font-blog tracking-tight">
                <Link
                  href={`/${post.slug}`}
                  className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 active:text-blue-700 dark:active:text-blue-500 transition-colors duration-200"
                >
                  {post.title}
                </Link>
              </h3>
              {post.excerpt && (
                <p className="text-17 text-gray-700 dark:text-gray-300 font-blog mt-2 leading-normal">
                  {post.excerpt.length > 120
                    ? `${post.excerpt.substring(0, 120)}...`
                    : post.excerpt}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </aside>
  );
}
