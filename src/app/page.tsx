"use client";

import Navbar from "@/components/navbar/Navbar";
import GoldenText from "@/ui/GoldenText";
import { useEffect, useState } from "react";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Handle theme toggle
  useEffect(() => {
    const handleThemeToggle = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "d" && (e.altKey || e.metaKey)) {
        e.preventDefault();
        setIsDarkMode((prev: boolean): boolean => !prev);
        if (document.documentElement.classList.contains("dark")) {
          document.documentElement.classList.remove("dark");
        } else {
          document.documentElement.classList.add("dark");
        }
      }
    };
    window.addEventListener("keydown", handleThemeToggle);
    return () => window.removeEventListener("keydown", handleThemeToggle);
  }, []);

  return (
    <div className="dark:bg-gray-700 h-screen overflow-y-hidden bg-white">
      <Navbar />
      <span className="hidden">{isDarkMode}</span>
      <div className="uppercase w-full text-center h-full mt-32">
        <GoldenText text="Gajanand Finance" />
      </div>
    </div>
  );
}