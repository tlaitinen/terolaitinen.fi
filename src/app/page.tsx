import { getPostsPage } from '@/lib/posts';
import PostCard from '@/components/PostCard';
import Pagination from '@/components/Pagination';

export const metadata = {
  title: "Tero's blog",
  description: "Personal blog by Tero Laitinen.",
  alternates: {
    canonical: 'https://terolaitinen.fi',
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
            excerpt={post.excerpt}
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
