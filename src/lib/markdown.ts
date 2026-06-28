import { remark } from 'remark';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';

export async function markdownToHtml(markdown: string): Promise<string> {
  // Replace mermaid code blocks with React component placeholders
  const processedMarkdown = markdown.replace(
    /```mermaid\n([\s\S]*?)\n```/g,
    (match, chart) => {
      const encodedChart = Buffer.from(chart.trim()).toString('base64');
      return `<div data-mermaid-chart="${encodedChart}"></div>`;
    }
  );

  const result = await remark()
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex, { output: 'html' })
    .use(rehypeHighlight)
    .use(rehypeSlug)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(processedMarkdown);
  
  let html = result.toString();

  // Add loading="lazy" to images for performance
  html = html.replace(
    /<img([^>]*)>/g,
    (match, attrs) => {
      // Skip if already has loading attribute
      if (/\sloading=/.test(attrs)) return match;
      return `<img${attrs} loading="lazy">`;
    }
  );

  return html;
}
