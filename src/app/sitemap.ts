import { getAllPosts, getAllTags, getPostsPage } from '@/lib/posts';
import { siteUrl } from '@/lib/site';
import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const tags = getAllTags();

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: siteUrl(post.slug),
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const tagEntries: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: siteUrl(`/tags/${tag.slug}`),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  const firstPage = getPostsPage(1, 5);
  const paginationEntries: MetadataRoute.Sitemap = [];
  for (let i = 2; i <= firstPage.totalPages; i++) {
    paginationEntries.push({
      url: siteUrl(`/page/${i}`),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.3,
    });
  }

  return [
    {
      url: siteUrl('/'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: siteUrl('/about'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: siteUrl('/tags'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    ...postEntries,
    ...tagEntries,
    ...paginationEntries,
  ];
}
