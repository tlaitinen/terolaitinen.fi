import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

function generateExcerpt(content: string): string {
  // Remove frontmatter first
  const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---/, '').trim();
  
  // Split into paragraphs (separated by double newlines)
  const paragraphs = contentWithoutFrontmatter.split(/\n\s*\n/);
  
  if (paragraphs.length === 0) return '';
  
  // Get the first paragraph and clean it up
  const firstParagraph = paragraphs[0]
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
    .replace(/`(.*?)`/g, '$1') // Remove inline code
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();
    
  return firstParagraph;
}

const postsDirectory = path.join(process.cwd(), 'content/posts');

export interface Post {
  slug: string;
  title: string;
  date: string;
  excerpt?: string;
  content: string;
  readingTime: number;
}

export function getAllPosts(): Post[] {
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      return {
        slug,
        title: data.title,
        date: data.date,
        excerpt: data.excerpt || generateExcerpt(content),
        content,
        readingTime: calculateReadingTime(content),
      };
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
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title,
      date: data.date,
      excerpt: data.excerpt || generateExcerpt(content),
      content,
      readingTime: calculateReadingTime(content),
    };
  } catch {
    return null;
  }
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