import { Metadata } from 'next';
import { getPostsPage } from '@/lib/posts';
import PostCard from '@/components/PostCard';
import Pagination from '@/components/Pagination';

export const metadata: Metadata = {
  title: "Tero's blog",
  description: "Personal technical blog by Tero Laitinen. Articles on software engineering, architecture, and technology.",
  alternates: {
    canonical: 'https://terolaitinen.fi',
    types: {
      'application/rss+xml': [{ url: 'https://terolaitinen.fi/feed.xml', title: "Tero's blog" }],
    },
  },
  openGraph: {
    title: "Tero's blog",
    description: "Personal technical blog by Tero Laitinen. Articles on software engineering, architecture, and technology.",
    url: 'https://terolaitinen.fi',
    type: 'website',
    locale: 'en_US',
    siteName: "Tero's blog",
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@terolaitinen',
    site: '@terolaitinen',
    title: "Tero's blog",
    description: "Personal technical blog by Tero Laitinen. Articles on software engineering, architecture, and technology.",
  },
};

export default function Home() {
  const pageData = getPostsPage(1, 5); // Show 5 posts per page

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      
      <div className="space-y-8">
        {pageData.posts.map((post) => (
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
      
      <Pagination
        currentPage={pageData.currentPage}
        totalPages={pageData.totalPages}
        hasNextPage={pageData.hasNextPage}
        hasPrevPage={pageData.hasPrevPage}
      />
    </div>
  );
}
