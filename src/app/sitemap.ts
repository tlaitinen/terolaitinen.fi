import { getAllPosts, getAllTags, getPostsPage } from '@/lib/posts';
import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const tags = getAllTags();
  const baseUrl = 'https://terolaitinen.fi';

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const tagEntries: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${baseUrl}/tags/${tag.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  const firstPage = getPostsPage(1, 5);
  const paginationEntries: MetadataRoute.Sitemap = [];
  for (let i = 2; i <= firstPage.totalPages; i++) {
    paginationEntries.push({
      url: `${baseUrl}/page/${i}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.3,
    });
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tags`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    ...postEntries,
    ...tagEntries,
    ...paginationEntries,
  ];
}
