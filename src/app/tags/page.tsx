import Link from 'next/link';
import { getAllTags } from '@/lib/posts';

export const metadata = {
  title: "Tags - Tero's blog",
  description: "Browse Tero Laitinen's blog posts by tag.",
  alternates: {
    canonical: 'https://terolaitinen.fi/tags',
  },
};

export default function TagsPage() {
  const tags = getAllTags();

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <header className="mb-10">
        <h1 className="mb-3 text-4xl font-extrabold text-gray-900 dark:text-white font-blog tracking-tight">
          Tags
        </h1>
        <p className="text-17 text-gray-700 dark:text-gray-300 font-blog leading-normal">
          Browse posts by topic.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        {tags.map((tag) => (
          <Link
            key={tag.slug}
            href={`/tags/${tag.slug}`}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors duration-200 hover:border-blue-300 hover:text-blue-600 active:text-blue-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400 dark:active:text-blue-500"
          >
            <span>#{tag.label}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{tag.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
