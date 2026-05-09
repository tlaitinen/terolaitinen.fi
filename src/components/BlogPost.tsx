import { markdownToHtml } from '@/lib/markdown';
import { format } from 'date-fns';
import { extractToc } from '@/lib/toc';
import MermaidDiagram from './MermaidDiagram';
import TagList from './TagList';
import TableOfContents from './TableOfContents';

interface BlogPostProps {
  title: string;
  date: string;
  tags: string[];
  content: string;
  readingTime: number;
  summary?: string;
}

function renderParts(parts: string[]) {
  return parts.map((part, index) => {
    const mermaidMatch = part.match(/^<div data-mermaid-chart="([^"]*)">/);
    if (mermaidMatch) {
      const encodedChart = mermaidMatch[1];
      const chart = Buffer.from(encodedChart, 'base64').toString('utf-8');
      return <MermaidDiagram key={index} chart={chart} />;
    }
    return <div key={index} dangerouslySetInnerHTML={{ __html: part }} />;
  });
}

export default async function BlogPost({ title, date, tags, content, readingTime, summary }: BlogPostProps) {
  const [htmlContent, summaryHtml] = await Promise.all([
    markdownToHtml(content),
    summary ? markdownToHtml(summary) : Promise.resolve(''),
  ]);

  const formattedDate = format(new Date(date), 'MMM d, yyyy').toUpperCase();
  const tocItems = extractToc(content);

  return (
    <article className="max-w-3xl mx-auto px-6 py-8">
      <header className="mb-10 text-center">
        <div className="flex items-center justify-center gap-2 text-12 mb-6 text-metadata font-bold tracking-wide">
          <time dateTime={date}>{formattedDate}</time>
          <span>•</span>
          <span>{readingTime} MIN READ</span>
        </div>
        <h1 className="mb-4 text-4xl font-extrabold text-gray-900 dark:text-white font-blog tracking-tight">
          {title}
        </h1>
      </header>

      {summaryHtml && (
        <div className="prose mb-10">
          {renderParts(summaryHtml.split(/(<div data-mermaid-chart="[^"]*"><\/div>)/))}
        </div>
      )}

      {tocItems.length > 0 && <TableOfContents items={tocItems} />}

      <div className="prose">
        {renderParts(htmlContent.split(/(<div data-mermaid-chart="[^"]*"><\/div>)/))}
      </div>
      {tags.length > 0 && (
        <footer className="mt-10 border-t border-gray-200 pt-6 dark:border-gray-700">
          <TagList tags={tags} />
        </footer>
      )}
    </article>
  );
}
