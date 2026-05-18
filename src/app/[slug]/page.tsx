import { notFound } from 'next/navigation';
import { getPostBySlug, getAllPosts } from '@/lib/posts';
import { siteFileUrl, siteUrl } from '@/lib/site';
import BlogPost from '@/components/BlogPost';
import RelatedPosts from '@/components/RelatedPosts';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  
  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: `${post.title} - Tero's blog`,
    description: post.excerpt || `Blog post: ${post.title}`,
    keywords: post.tags,
    authors: [{ name: 'Tero Laitinen', url: siteUrl('/about') }],
    alternates: {
      canonical: siteUrl(slug),
      types: {
        'application/rss+xml': [{ url: siteFileUrl('/feed.xml'), title: "Tero's blog" }],
      },
    },
    openGraph: {
      title: post.title,
      description: post.excerpt || `Blog post: ${post.title}`,
      url: siteUrl(slug),
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.date,
      authors: ['Tero Laitinen'],
      tags: post.tags,
      locale: 'en_US',
      siteName: "Tero's blog",
    },
    twitter: {
      card: 'summary_large_image',
      creator: '@terolaitinen',
      site: '@terolaitinen',
      title: post.title,
      description: post.excerpt || `Blog post: ${post.title}`,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || `Blog post: ${post.title}`,
    author: {
      '@type': 'Person',
      name: 'Tero Laitinen',
      url: siteUrl('/about'),
    },
    datePublished: post.date,
    dateModified: post.date,
    url: siteUrl(slug),
    keywords: post.tags.join(', '),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': siteUrl(slug),
    },
    publisher: {
      '@type': 'Person',
      name: 'Tero Laitinen',
      url: siteUrl('/'),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogPost
        title={post.title}
        date={post.date}
        tags={post.tags}
        content={post.content}
        readingTime={post.readingTime}
        summary={post.summary}
      />
      <RelatedPosts currentSlug={slug} />
    </>
  );
}
