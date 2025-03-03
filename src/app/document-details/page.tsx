'use client';

import { useState, useEffect } from 'react';
import UserForm from '@/components/user/UserForm';
import UserList from '@/components/user/UserList';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigationStore } from '@/store/NavigationStore';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  holderName: string;
  name: string;
  fileNumber: string;
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const setSelectedNavItem = useNavigationStore((state) => state.setSelectedNavItem);
  const router = useRouter();

  const fetchUsers = async () => {
    setIsLoading(true);
    const response = await fetch('/api/users');
    const data = await response.json();
    if (data.success) {
      setUsers(data.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (!savedTheme) {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      setIsDarkMode(savedTheme === "dark");
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("theme", newMode ? "dark" : "light");
      if (newMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return newMode;
    });
  };

  useEffect(() => {
    const handleThemeToggle = (e: WindowEventMap["keydown"]) => {
      if (e.key.toLowerCase() === "d" && (e.altKey || e.metaKey)) {
        e.preventDefault();
        toggleTheme();
      }
    };
    window.addEventListener("keydown", handleThemeToggle);
    return () => window.removeEventListener("keydown", handleThemeToggle);
  }, []);

  // Escape key navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedNavItem("Master", 2);
        router.push("/");
      }
    };
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [router, setSelectedNavItem]);

  // Group users by fileNumber
  const groupedUsers = users.reduce((acc: { [key: string]: User[] }, user) => {
    acc[user.fileNumber] = [...(acc[user.fileNumber] || []), user];
    return acc;
  }, {});

  // Filter users based on search query
  const filteredGroupedUsers = Object.keys(groupedUsers).reduce((acc: { [key: string]: User[] }, fileNumber) => {
    const filtered = groupedUsers[fileNumber].filter(
      (user) =>
        user.holderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.fileNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[fileNumber] = filtered;
    }
    return acc;
  }, {});

  return (
    <main className="bg-[#fff2e0] dark:bg-[#181717] text-gray-900 dark:text-gray-100 transition-colors duration-300 mx-auto p-6 min-h-screen">
      <motion.h1
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-5xl font-bold text-orange-500 dark:text-orange-400 mb-8 text-center"
      >
        Document Details <span className='hidden'> {isDarkMode} </span>
      </motion.h1>

      {/* Theme Toggle and Search */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8 flex justify-center items-center"
      >
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Search by Name, Holder Name, or File Number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-4 pl-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-orange-300 dark:focus:ring-orange-500 shadow-lg transition-all duration-300 hover:shadow-xl"
          />
          <svg
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-orange-500 dark:text-orange-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
      </motion.div>

      {/* Toggle Form Button */}
     <div className='flex justify-center'>
     <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        onClick={() => setIsFormOpen(!isFormOpen)}
        className="mb-8 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-full shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 "
      >
        {isFormOpen ? 'Close Form' : 'Add New User'}
      </motion.button>
     </div>

      {/* User Form */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
          >
            <UserForm onUserAdded={fetchUsers} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-gray-600 dark:text-gray-300 text-xl"
        >
          <svg className="animate-spin h-10 w-10 mx-auto text-orange-500 dark:text-orange-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h-8z" />
          </svg>
          Loading Users...
        </motion.div>
      ) : (
        <UserList
          groupedUsers={filteredGroupedUsers}
          onUserUpdated={fetchUsers}
          onUserDeleted={fetchUsers}
        />
      )}
    </main>
  );
}