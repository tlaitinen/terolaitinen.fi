import Link from "next/link";
import { format } from "date-fns";
import { markdownToHtml } from "@/lib/markdown";

interface PostCardProps {
  title: string;
  slug: string;
  date: string;
  summary?: string;
  readingTime: number;
}

export default async function PostCard({
  title,
  slug,
  date,
  summary,
  readingTime,
}: PostCardProps) {
  const formattedDate = format(new Date(date), "MMM d, yyyy").toUpperCase();
  const summaryHtml = summary ? await markdownToHtml(summary) : "";

  return (
    <article className="pb-6 mb-6">
      <div className="flex items-center gap-2 text-12 mb-3 text-metadata font-bold tracking-wide">
        <time dateTime={date}>{formattedDate}</time>
        <span>•</span>
        <span>{readingTime} MIN READ</span>
      </div>
      <h2 className="text-3xl mb-4 font-extrabold font-blog tracking-tight">
        <Link
          href={`/${slug}`}
          className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 active:text-blue-700 dark:active:text-blue-500 transition-colors duration-200"
        >
          {title}
        </Link>
      </h2>
      {summaryHtml && (
        <div
          className="text-17 text-gray-700 dark:text-gray-300 font-blog mb-0 leading-normal"
          dangerouslySetInnerHTML={{ __html: summaryHtml }}
        />
      )}
    </article>
  );
}
