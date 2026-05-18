import { Metadata } from 'next';
import { markdownToHtml } from '@/lib/markdown';
import { getAboutPage } from '@/lib/posts';
import { siteFileUrl, siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About me - Tero\'s blog',
  description: 'About Tero Laitinen - Staff Engineer at Wolt, technical blogger, and former researcher. Writing about software engineering, architecture, and technology.',
  alternates: {
    canonical: siteUrl('/about'),
    types: {
      'application/rss+xml': [{ url: siteFileUrl('/feed.xml'), title: "Tero's blog" }],
    },
  },
  openGraph: {
    title: 'About me - Tero\'s blog',
    description: 'About Tero Laitinen - Staff Engineer at Wolt, technical blogger, and former researcher.',
    url: siteUrl('/about'),
    type: 'profile',
    locale: 'en_US',
    siteName: "Tero's blog",
  },
  twitter: {
    card: 'summary',
    creator: '@terolaitinen',
    site: '@terolaitinen',
    title: 'About me - Tero\'s blog',
    description: 'About Tero Laitinen - Staff Engineer at Wolt, technical blogger, and former researcher.',
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: 'Tero Laitinen',
      url: siteUrl('/'),
      sameAs: [
        'https://github.com/terolaitinen',
        'https://www.linkedin.com/in/tero-laitinen-b6918525/',
      ],
      jobTitle: 'Staff Engineer',
      worksFor: {
        '@type': 'Organization',
        name: 'Wolt',
      },
      description: 'Staff Engineer at Wolt, technical blogger, and former researcher. Writing about software engineering, architecture, and technology.',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white font-blog tracking-tight mb-10">About me</h1>
        <div 
          className="prose prose-lg max-w-none prose-gray dark:prose-invert font-blog"
          dangerouslySetInnerHTML={{ __html: htmlContent }} 
        />
      </div>
    </>
  );
}
