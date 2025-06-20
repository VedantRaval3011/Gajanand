'use client';

// Import React and Next.js navigation hooks for TypeScript
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Define the UnderDevelopment component
const UnderDevelopment: React.FC = () => {
  // Get the router object for navigation
  const router = useRouter();

  // Handle keypress event for Escape key
  useEffect(() => {
    // Function to check if Escape key is pressed
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        router.push('/'); // Navigate to homepage
      }
    };

    // Add event listener for keydown
    window.addEventListener('keydown', handleKeyPress);

    // Cleanup: Remove event listener when component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [router]); // Dependency array includes router to avoid stale closures

  // Handle button click to navigate back to homepage
  const handleButtonClick = () => {
    router.push('/'); // Navigate to homepage
  };

  // JSX for the component UI with futuristic orange theme
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Futuristic container with orange glow */}
      <div className="relative p-8 rounded-2xl bg-gray-800/50 backdrop-blur-md shadow-[0_0_20px_rgba(255,147,41,0.5)] border border-orange-500">
        {/* Heading with futuristic font and animation */}
        <h1 className="text-5xl font-extrabold tracking-tight text-orange-400 animate-pulse">
          Under Development
        </h1>
        {/* Message with sleek styling */}
        <p className="text-xl text-orange-200 mt-4 mb-8 max-w-md text-center">
          This page is still in the works. Press <span className="font-semibold text-orange-300">Esc</span> or click below to return to the homepage.
        </p>
        {/* Button with neon hover effect */}
        <span className='flex justify-center'>
          <button
          onClick={handleButtonClick}
          className="px-8 py-3 bg-orange-600 text-white font-semibold rounded-full hover:bg-orange-700 hover:shadow-[0_0_15px_rgba(255,147,41,0.8)] transition-all duration-300"
        >
          Back to Home
        </button>
        </span>
      </div>
      {/* Background decorative elements for futuristic vibe */}
      <div className="absolute inset-0 z-[-1] overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-32 bg-orange-500/20 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-orange-600/20 rounded-full filter blur-3xl"></div>
      </div>
    </div>
  );
};

// Export the component
export default UnderDevelopment;