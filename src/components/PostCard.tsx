import Link from 'next/link';
import { format } from 'date-fns';

interface PostCardProps {
  title: string;
  slug: string;
  date: string;
  excerpt?: string;
  readingTime: number;
}

export default function PostCard({ title, slug, date, excerpt, readingTime }: PostCardProps) {
  const formattedDate = format(new Date(date), 'MMM d, yyyy').toUpperCase();

  return (
    <article className="pb-6 mb-6">
      <div className="flex items-center gap-2 text-12 mb-3 text-metadata font-bold tracking-wide">
        <time>{formattedDate}</time>
        <span>•</span>
        <span>{readingTime} MIN READ</span>
      </div>
      <h2 className="text-3xl mb-4 font-extrabold font-blog tracking-tight">
        <Link 
          href={`/${slug}`} 
          className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 active:text-blue-700 dark:active:text-blue-500 transition-colors duration-200"
        >
          {title}
        </Link>
      </h2>
      {excerpt && (
        <p className="text-17 text-gray-700 dark:text-gray-300 font-blog mb-0 leading-normal">
          {excerpt.length > 150 ? `${excerpt.substring(0, 150)}...` : excerpt}
        </p>
      )}
    </article>
  );
}