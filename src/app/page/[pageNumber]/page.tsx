import { notFound } from 'next/navigation';
import { getPostsPage } from '@/lib/posts';
import PostCard from '@/components/PostCard';
import Pagination from '@/components/Pagination';

interface PageProps {
  params: Promise<{ pageNumber: string }>;
}

export async function generateStaticParams() {
  const firstPage = getPostsPage(1, 5);
  const pages = [];
  
  for (let i = 2; i <= firstPage.totalPages; i++) {
    pages.push({ pageNumber: i.toString() });
  }
  
  return pages;
}

export async function generateMetadata({ params }: PageProps) {
  const { pageNumber } = await params;
  const page = parseInt(pageNumber, 10);
  
  return {
    title: `Page ${page} - Tero's blog`,
    description: `Blog posts page ${page}`,
    alternates: {
      canonical: `https://terolaitinen.fi/page/${page}`,
    },
  };
}

export default async function PageNumberPage({ params }: PageProps) {
  const { pageNumber } = await params;
  const page = parseInt(pageNumber, 10);
  
  if (isNaN(page) || page < 1) {
    notFound();
  }
  
  const pageData = getPostsPage(page, 5);
  
  if (pageData.posts.length === 0) {
    notFound();
  }

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