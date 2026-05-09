'use client';

import { useState } from 'react';
import { TocItem } from '@/lib/toc';

interface TableOfContentsProps {
  items: TocItem[];
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (items.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        aria-expanded={isOpen}
        aria-controls="toc-list"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Table of Contents
        <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">
          ({items.length})
        </span>
      </button>

      {isOpen && (
        <ul id="toc-list" className="mt-3 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
          {items.map((item) => (
            <li
              key={item.slug}
              className={item.level === 3 ? 'ml-4' : ''}
            >
              <a
                href={`#${item.slug}`}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
