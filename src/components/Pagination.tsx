import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function Pagination({ currentPage, totalPages, hasNextPage, hasPrevPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-between items-center mt-12 pt-8">
      <div className="flex items-center">
        {hasPrevPage ? (
          <Link
            href={currentPage === 2 ? '/' : `/page/${currentPage - 1}`}
            className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 active:text-blue-800 dark:active:text-blue-200 font-medium transition-colors duration-200"
          >
            ← Newer posts
          </Link>
        ) : (
          <span className="px-4 py-2 text-gray-400 dark:text-gray-500">← Newer posts</span>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <span className="text-gray-500 dark:text-gray-400">
          Page {currentPage} of {totalPages}
        </span>
      </div>
      
      <div className="flex items-center">
        {hasNextPage ? (
          <Link
            href={`/page/${currentPage + 1}`}
            className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 active:text-blue-800 dark:active:text-blue-200 font-medium transition-colors duration-200"
          >
            Older posts →
          </Link>
        ) : (
          <span className="px-4 py-2 text-gray-400 dark:text-gray-500">Older posts →</span>
        )}
      </div>
    </div>
  );
}