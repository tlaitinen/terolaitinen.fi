import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

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
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeHighlight)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(processedMarkdown);
  
  return result.toString();
}