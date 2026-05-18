import Link from 'next/link';
import { tagToSlug } from '@/lib/tags';

interface TagListProps {
  tags: string[];
  align?: 'left' | 'center';
  className?: string;
}

export default function TagList({ tags, align = 'left', className = '' }: TagListProps) {
  if (tags.length === 0) {
    return null;
  }

  const alignment = align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <div className={`flex flex-wrap gap-2 ${alignment} ${className}`}>
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/tags/${tagToSlug(tag)}/`}
          className="inline-flex rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 transition-colors duration-200 hover:border-blue-300 hover:text-blue-600 active:text-blue-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400 dark:active:text-blue-500"
        >
          #{tag}
        </Link>
      ))}
    </div>
  );
}
