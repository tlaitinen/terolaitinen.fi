import { getAllPosts } from '@/lib/posts';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const dynamic = 'force-static';

export async function GET() {
  const posts = getAllPosts();
  const baseUrl = 'https://terolaitinen.fi';

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>Tero's blog</title>
  <link>${baseUrl}</link>
  <description>Personal technical blog by Tero Laitinen. Articles on software engineering, architecture, and technology.</description>
  <language>en</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
  ${posts.map(post => `
  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${baseUrl}/${post.slug}</link>
    <guid isPermaLink="true">${baseUrl}/${post.slug}</guid>
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <description>${escapeXml(post.excerpt || '')}</description>
    ${post.tags.length > 0 ? post.tags.map(tag => `<category>${escapeXml(tag)}</category>`).join('\n    ') : ''}
  </item>`).join('')}
</channel>
</rss>`;

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
