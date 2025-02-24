'use client'

import { Ubuntu } from 'next/font/google';
import Link from 'next/link';

const ubuntu = Ubuntu({
    weight: '400',
    subsets: ['latin'],
})

export default function NotFound() {
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 ${ubuntu.className} `}>
      <div className="text-center p-8 rounded-lg bg-white/90 shadow-xl max-w-md mx-4">
        <h1 className="text-8xl font-bold text-orange-600 mb-4 animate-pulse">404</h1>
        <h2 className="text-3xl font-semibold text-orange-800 mb-6">Page Not Found</h2>
        <p className="text-orange-700 mb-8 text-xl">
          Oops! DK
          The page you are looking for doesnot exist or has been moved.
        </p>
        <Link 
          href="/"
          className="inline-block px-6 py-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors duration-300"
        >
          Return Home
        </Link>
      </div>
      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}