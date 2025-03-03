"use client";
import Navbar from "@/components/navbar/Navbar";
import GoldenText from "@/ui/GoldenText";
import { useEffect, useState } from "react";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    // Check if theme is saved in localStorage
    const savedTheme = localStorage.getItem("theme");
    
    // If no saved theme, explicitly set to light mode as default
    if (!savedTheme) {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      // Apply saved theme
      if (savedTheme === "dark") {
        setIsDarkMode(true);
        document.documentElement.classList.add("dark");
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove("dark");
      }
    }
    
    // Force remove dark mode class to ensure light mode is default
    if (savedTheme !== "dark") {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Handle theme toggle
  useEffect(() => {
    const handleThemeToggle = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "d" && (e.altKey || e.metaKey)) {
        e.preventDefault();
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