'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react'; // Assuming you're using Lucide React icons
import { Ubuntu } from 'next/font/google';
import Link from 'next/link';

const ubuntu = Ubuntu({
  weight: "400",
  subsets: ["latin"],
});

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      if (res.ok) {
        await new Promise(resolve => setTimeout(resolve, 100));
        router.refresh(); 
        router.push('/');
      } else {
        const data = await res.json();
        setError(data.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex justify-center items-center min-h-screen bg-gradient-to-r from-amber-500 to-orange-500 ${ubuntu.className}`}>
      <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-3xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-bold text-center mb-8 text-amber-600">Welcome to Gajanand!</h1>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        
        <div className="mb-6">
          <label className="block text-gray-700 text-2xl font-bold mb-2" htmlFor="username">
            Username
          </label>
          <input 
            id="username"
            type="text"
            placeholder="Enter your username"
            value={username.trim()}
            onChange={(e) => setUsername(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-amber-500"
          />
        </div>
        
        <div className="mb-6 relative">
          <label className="block text-gray-700 text-xl font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input 
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password.trim()}
            onChange={(e) => setPassword(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline focus:border-amber-500"
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-0 top-2 mt-10 mr-4 text-gray-600"
          >
            {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
          </button>
        </div>
       
        <div className="flex justify-center flex-col gap-2">
          <button 
            type="submit"
            className={`bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline w-full text-xl ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
          <Link href="/reset-credentials" className=' text-orange-600 flex items-center justify-center'>Forgot Password?</Link>
        </div>
      </form>
    </div>
  );
}