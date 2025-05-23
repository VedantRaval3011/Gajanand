"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { LOAN_TYPES, FILE_CATEGORIES } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useNavigationStore } from "@/store/NavigationStore";
import AccountFinder from "@/components/print-head/AccountFinder"; // Import the new AccountFinder component

export default function AdminPage() {
  const [customCategories] = useState<{
    [key: string]: string[];
  }>({
    daily: [...FILE_CATEGORIES.daily],
    monthly: [...FILE_CATEGORIES.monthly],
    pending: [...FILE_CATEGORIES.pending],
  });
  const setSelectedNavItem = useNavigationStore(
    (state) => state.setSelectedNavItem
  );
  const router = useRouter();

  // Function to handle navigation to home
  const navigateToHome = () => {
    router.push("/");
    setSelectedNavItem("Master", 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        navigateToHome();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative flex flex-col items-center p-4 sm:p-6 md:p-10 min-h-screen text-white overflow-hidden">
      {/* Background Gradient with Wave Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-400 to-orange-600 z-0">
        <svg
          className="absolute bottom-0 left-0 w-full h-1/3 opacity-30"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="#ffffff"
            fillOpacity="0.2"
            d="M0,192L48,186.7C96,181,192,171,288,160C384,149,480,139,576,149.3C672,160,768,192,864,197.3C960,203,1056,181,1152,176C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl">
        <div className="flex gap-8 justify-center items-center mb-8 sm:mb-10 md:mb-12">
          <button
            onClick={navigateToHome}
            className="px-4 py-2 text-sm sm:text-base font-semibold text-white bg-orange-700 hover:bg-orange-800 transition-colors duration-300 rounded-md"
          >
            Home
          </button>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold animate-fade-in text-center uppercase">
            Collections
          </h1>
        </div>

        {/* Account Finder Section */}
        <AccountFinder />

        <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-6 md:gap-8">
          {LOAN_TYPES.map((type) => (
            <div
              key={type.id}
              className="w-full sm:flex-1 bg-orange-700/20 backdrop-blur-sm rounded-lg p-4 sm:p-5 md:p-6 shadow-lg transition-transform duration-300 hover:scale-105 border border-orange-600/30 mb-4 sm:mb-0"
            >
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-orange-100 text-center">
                {type.name}
              </h2>
              <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 justify-center">
                {customCategories[type.id]?.map((category) => (
                  <Link
                    key={category}
                    href={`/admin/loans/${type.id}?category=${category}`}
                    className="px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 text-sm sm:text-base md:text-lg font-semibold text-white bg-orange-700 hover:bg-orange-800 transition-colors duration-300 rounded-md"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// CSS for fade-in animation
const styles = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 1s ease-out;
  }
`;

if (typeof window !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}