import { markdownToHtml } from '@/lib/markdown';
import { format } from 'date-fns';

interface BlogPostProps {
  title: string;
  date: string;
  content: string;
  readingTime: number;
}

export default async function BlogPost({ title, date, content, readingTime }: BlogPostProps) {
  const htmlContent = await markdownToHtml(content);
  const formattedDate = format(new Date(date), 'MMM d, yyyy').toUpperCase();

  return (
    <article className="max-w-3xl mx-auto px-6 py-8">
      <header className="mb-10 text-center">
        <div className="flex items-center justify-center gap-2 text-12 mb-6 text-metadata font-bold tracking-wide">
          <time>{formattedDate}</time>
          <span>•</span>
          <span>{readingTime} MIN READ</span>
        </div>
        <h1 className="mb-4 text-4xl font-extrabold text-gray-900 dark:text-white font-blog tracking-tight">
          {title}
        </h1>
      </header>
      <div 
        className="prose"
        dangerouslySetInnerHTML={{ __html: htmlContent }} 
      />
    </article>
  );
}