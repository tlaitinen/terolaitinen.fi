export default function Footer() {
  return (
    <footer className="mt-12 py-8">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className="flex items-center justify-center space-x-6 mb-6">
          <a 
            href="https://github.com/terolaitinen" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            GitHub
          </a>
          <a 
            href="https://linkedin.com/in/terolaitinen" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}