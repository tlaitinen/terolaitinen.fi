import GithubSlugger from 'github-slugger';

export interface TocItem {
  text: string;
  slug: string;
  level: number;
}

/**
 * Extract table of contents from markdown content.
 * Looks for h2 and h3 headings and generates GitHub-style slugs.
 */
export function extractToc(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const items: TocItem[] = [];
  const slugger = new GithubSlugger();

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const rawText = match[2].trim();
    const text = stripMarkdownInlineFormatting(rawText);
    const slug = slugger.slug(text);

    items.push({ text, slug, level });
  }

  return items;
}

/**
 * Remove common inline markdown formatting (bold, italic) from heading text
 * so the TOC displays clean text instead of raw asterisks.
 */
function stripMarkdownInlineFormatting(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // ***bold italic***
    .replace(/\*\*(.+?)\*\*/g, '$1')      // **bold**
    .replace(/\*(.+?)\*/g, '$1')           // *italic*
    .replace(/___(.+?)___/g, '$1')         // ___bold italic___
    .replace(/__(.+?)__/g, '$1')           // __bold__
    .replace(/_(.+?)_/g, '$1');            // _italic_
}
