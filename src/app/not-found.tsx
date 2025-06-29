'use client';

import { useEffect } from 'react';

export default function NotFound() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && currentPath.endsWith('/')) {
        const newPath = currentPath.slice(0, -1) + window.location.search + window.location.hash;
        window.location.replace(newPath);
        return;
      }
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
      <p className="text-gray-600">The page you&apos;re looking for doesn&apos;t exist.</p>
    </div>
  );
}