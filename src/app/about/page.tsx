import { markdownToHtml } from '@/lib/markdown';
import { getAboutPage } from '@/lib/posts';

export const metadata = {
  title: 'About me - Tero\'s blog',
  description: 'About Tero Laitinen - Staff Engineer and technical blogger',
  alternates: {
    canonical: 'https://terolaitinen.fi/about',
  },
};

export default async function AboutPage() {
  const aboutData = getAboutPage();

  if (!aboutData) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white font-blog tracking-tight mb-8">About me</h1>
        <p className="text-17 text-gray-700 dark:text-gray-300 font-blog">About page content not found.</p>
      </div>
    );
  }

  const htmlContent = await markdownToHtml(aboutData.content);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white font-blog tracking-tight mb-10">About me</h1>
      <div 
        className="prose prose-lg max-w-none prose-gray dark:prose-invert font-blog"
        dangerouslySetInnerHTML={{ __html: htmlContent }} 
      />
    </div>
  );
}