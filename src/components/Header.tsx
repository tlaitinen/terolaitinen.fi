import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white dark:bg-gray-900 transition-colors">
      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-extrabold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 active:text-blue-700 dark:active:text-blue-500 transition-colors duration-200 tracking-tight">
            Tero&apos;s blog
          </Link>
          <div className="flex items-center space-x-6">
            <nav className="flex space-x-6">
              <Link href="/" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 active:text-blue-700 dark:active:text-blue-500 transition-colors duration-200 font-semibold">
                Home
              </Link>
              <Link href="/about" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 active:text-blue-700 dark:active:text-blue-500 transition-colors duration-200 font-semibold">
                About
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}