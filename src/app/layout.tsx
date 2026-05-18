import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import { SITE_ORIGIN, siteFileUrl, siteUrl } from "@/lib/site";

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: "Tero's blog",
  description: "Personal technical blog by Tero Laitinen. Articles on software engineering, architecture, and technology.",
  authors: [{ name: 'Tero Laitinen', url: siteUrl('/about') }],
  keywords: ['Tero Laitinen', 'software engineering', 'blog'],
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl('/'),
    siteName: "Tero's blog",
    title: "Tero's blog",
    description: "Personal technical blog by Tero Laitinen. Articles on software engineering, architecture, and technology.",
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@terolaitinen',
    site: '@terolaitinen',
    title: "Tero's blog",
    description: "Personal technical blog by Tero Laitinen. Articles on software engineering, architecture, and technology.",
  },
  alternates: {
    canonical: siteUrl('/'),
    types: {
      'application/rss+xml': [{ url: siteFileUrl('/feed.xml'), title: "Tero's blog" }],
    },
  },
};

const themeScript = `
  (function() {
    function getCookie(name) {
      var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : null;
    }
    var theme = getCookie('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <link rel="preconnect" href="https://github.com" />
        <link rel="preconnect" href="https://linkedin.com" />
        <link rel="dns-prefetch" href="https://careers.wolt.com" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} antialiased bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-inter transition-colors`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:font-semibold"
        >
          Skip to content
        </a>
        <Header />
        <main id="main-content" className="min-h-screen">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
