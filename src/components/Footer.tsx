export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 py-8">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className="flex items-center justify-center space-x-6 mb-6">
          <a 
            href="https://github.com/tlaitinen" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 active:text-blue-700 dark:active:text-blue-500 transition-colors duration-200"
          >
            GitHub
          </a>
          <a 
            href="https://www.linkedin.com/in/tero-laitinen-b6918525/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 active:text-blue-700 dark:active:text-blue-500 transition-colors duration-200"
          >
            LinkedIn
          </a>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          &copy; {currentYear} Tero Laitinen. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
