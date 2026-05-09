import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <header className="bg-white dark:bg-gray-900 transition-colors">
      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <Link href="/" className="text-2xl font-extrabold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 active:text-blue-700 dark:active:text-blue-500 transition-colors duration-200 tracking-tight">
            Tero&apos;s blog
          </Link>
          <div className="flex flex-wrap items-center gap-6">
            <nav aria-label="Main navigation" className="flex flex-wrap gap-6">
              <Link href="/" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 active:text-blue-700 dark:active:text-blue-500 transition-colors duration-200 font-semibold">
                Home
              </Link>
              <Link href="/tags" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 active:text-blue-700 dark:active:text-blue-500 transition-colors duration-200 font-semibold">
                Tags
              </Link>
              <Link href="/about" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 active:text-blue-700 dark:active:text-blue-500 transition-colors duration-200 font-semibold">
                About
              </Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
