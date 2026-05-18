import { notFound } from 'next/navigation';
import { getAllTags, getPostsByTag, getTagBySlug } from '@/lib/posts';
import { siteFileUrl, siteUrl } from '@/lib/site';
import PostCard from '@/components/PostCard';

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  return getAllTags().map((tag) => ({
    tag: tag.slug,
  }));
}

export async function generateMetadata({ params }: TagPageProps) {
  const { tag } = await params;
  const tagData = getTagBySlug(tag);

  if (!tagData) {
    return {
      title: 'Tag Not Found',
    };
  }

  return {
    title: `${tagData.label} - Tero's blog`,
    description: `Explore blog posts about ${tagData.label}. Technical articles, tutorials, and insights by Tero Laitinen on ${tagData.label} and related topics.`,
    alternates: {
      canonical: siteUrl(`/tags/${tagData.slug}`),
      types: {
        'application/rss+xml': [{ url: siteFileUrl('/feed.xml'), title: "Tero's blog" }],
      },
    },
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const tagData = getTagBySlug(tag);

  if (!tagData) {
    notFound();
  }

  const posts = getPostsByTag(tagData.slug);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <header className="mb-10">
        <div className="mb-3 text-12 text-metadata font-bold tracking-wide">
          {tagData.count} {tagData.count === 1 ? 'POST' : 'POSTS'}
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white font-blog tracking-tight">
          #{tagData.label}
        </h1>
      </header>

      <div className="space-y-8">
        {posts.map((post) => (
          <PostCard
            key={post.slug}
            title={post.title}
            slug={post.slug}
            date={post.date}
            summary={post.summary}
            readingTime={post.readingTime}
          />
        ))}
      </div>
    </div>
  );
}
