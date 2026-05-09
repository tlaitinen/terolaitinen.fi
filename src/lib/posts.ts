import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { normalizeTags, normalizeTagSlug, tagToSlug } from './tags';

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

function generateExcerpt(content: string): string {
  // Remove frontmatter first
  const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---/, '').trim();
  
  // Remove mermaid code blocks
  const contentWithoutMermaid = contentWithoutFrontmatter.replace(/```mermaid[\s\S]*?```/g, '');
  
  // Split into paragraphs (separated by double newlines)
  const paragraphs = contentWithoutMermaid.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  if (paragraphs.length === 0) return '';
  
  // Find the first non-empty paragraph that's not just a header
  let firstParagraph = '';
  for (const paragraph of paragraphs) {
    const cleaned = paragraph
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();
    
    if (cleaned.length > 20) { // Only use paragraphs with substantial content
      firstParagraph = cleaned;
      break;
    }
  }
    
  return firstParagraph;
}

export function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Find the last space within the limit
  const truncated = text.slice(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  // If no space found, just truncate at limit (rare for long text)
  if (lastSpaceIndex === -1) return truncated + '...';
  
  return truncated.slice(0, lastSpaceIndex) + '...';
}

const postsDirectory = path.join(process.cwd(), 'content/posts');

export interface Post {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  excerpt?: string;
  content: string;
  readingTime: number;
}

export interface Tag {
  label: string;
  slug: string;
  count: number;
}

function parsePostFile(slug: string, fileContents: string): Post {
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: data.title,
    date: data.date,
    tags: normalizeTags(data.tags),
    excerpt: data.excerpt || generateExcerpt(content),
    content,
    readingTime: calculateReadingTime(content),
  };
}

export function getAllPosts(): Post[] {
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      return parsePostFile(slug, fileContents);
    });

  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostsPage(page: number = 1, postsPerPage: number = 5) {
  const allPosts = getAllPosts();
  const startIndex = (page - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  
  return {
    posts: allPosts.slice(startIndex, endIndex),
    totalPosts: allPosts.length,
    totalPages: Math.ceil(allPosts.length / postsPerPage),
    currentPage: page,
    hasNextPage: endIndex < allPosts.length,
    hasPrevPage: page > 1,
  };
}

export function getPostBySlug(slug: string): Post | null {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    return parsePostFile(slug, fileContents);
  } catch {
    return null;
  }
}

export function getAllTags(): Tag[] {
  const tagsBySlug = new Map<string, Tag>();

  for (const post of getAllPosts()) {
    for (const tag of post.tags) {
      const slug = tagToSlug(tag);
      const existing = tagsBySlug.get(slug);

      tagsBySlug.set(slug, {
        label: existing?.label ?? tag,
        slug,
        count: (existing?.count ?? 0) + 1,
      });
    }
  }

  return Array.from(tagsBySlug.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    return a.label.localeCompare(b.label);
  });
}

export function getTagBySlug(slug: string): Tag | null {
  const normalizedSlug = normalizeTagSlug(slug);
  return getAllTags().find((tag) => tag.slug === normalizedSlug) ?? null;
}

export function getPostsByTag(slug: string): Post[] {
  const normalizedSlug = normalizeTagSlug(slug);

  return getAllPosts().filter((post) =>
    post.tags.some((tag) => tagToSlug(tag) === normalizedSlug)
  );
}

export function getRelatedPosts(slug: string, limit: number = 3): Post[] {
  const targetPost = getPostBySlug(slug);
  if (!targetPost) return [];

  const allPosts = getAllPosts();
  const targetTagSlugs = new Set(targetPost.tags.map(tagToSlug));

  // Score posts by shared tags
  const scored = allPosts
    .filter((post) => post.slug !== slug)
    .map((post) => {
      const sharedTags = post.tags.filter((tag) => targetTagSlugs.has(tagToSlug(tag))).length;
      return { post, score: sharedTags };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Tie-break by recency
      return new Date(b.post.date).getTime() - new Date(a.post.date).getTime();
    })
    .slice(0, limit)
    .map((item) => item.post);

  return scored;
}

export function getAboutPage() {
  try {
    const fullPath = path.join(process.cwd(), 'content/about.md');
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      title: data.title,
      content,
    };
  } catch {
    return null;
  }
}
