import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
  metadataBase: new URL('https://terolaitinen.fi'),
  title: "Tero's blog",
  description: "Personal technical blog by Tero Laitinen. Articles on software engineering, architecture, and technology.",
  authors: [{ name: 'Tero Laitinen', url: 'https://terolaitinen.fi/about' }],
  keywords: ['Tero Laitinen', 'software engineering', 'React', 'TypeScript', 'blog'],
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://terolaitinen.fi',
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
    canonical: 'https://terolaitinen.fi',
    types: {
      'application/rss+xml': [{ url: 'https://terolaitinen.fi/feed.xml', title: "Tero's blog" }],
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-inter transition-colors`}>
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
