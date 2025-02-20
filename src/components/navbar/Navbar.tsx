"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Ubuntu } from "next/font/google";
import TimeDisplay from "@/ui/TimeDisplay";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";

type NavItem = "Master" | "Transaction" | "Report" | "Utilities";
type SubNavItem = {
  title: string;
  href: string;
  shortcut: string;
};

const ubuntu = Ubuntu({
  weight: "400",
  subsets: ["latin"],
});

export default function Navbar() {
  const [selected, setSelected] = useState<NavItem>("Master");
  const [focusedSubItem, setFocusedSubItem] = useState<number>(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navItems: NavItem[] = ["Master", "Transaction", "Report", "Utilities"];
  const router = useRouter();

  const subNavItems: Record<NavItem, SubNavItem[]> = {
    Master: [
      { title: "Loan", href: "/loan", shortcut: "1" },
      { title: "Saving A/C", href: "/saving", shortcut: "2" },
      { title: "Master File...", href: "/master-file", shortcut: "3" },
      { title: "Guaranter Master", href: "/guaranter-master", shortcut: "4" },
      { title: "Print Head", href: "/print-head", shortcut: "5" },
      { title: "Keyboard Shortcut", href: "/keyboard-shortcut", shortcut: "6" },
    ],
    Transaction: [
      { title: "Collection Book", href: "/collection-book", shortcut: "1" },
      { title: "Day Book", href: "/day-book", shortcut: "2" },
    ],
    Report: [
      { title: "B-6", href: "/payment-dashboard", shortcut: "1" },
      { title: "Month Wise Yearly Collection", href: "/month-wise-yearly-collection", shortcut: "2" },
      { title: "Loan Wedger", href: "/loan-wedger", shortcut: "3" },
      { title: "Deposit Ledger", href: "/deposit-ledger", shortcut: "4" },
      { title: "Financial statement", href: "/financial-statement", shortcut: "5" },
      { title: "Crediter/Depositer", href: "/crediter-or-depositor", shortcut: "6" },
    ],
    Utilities: [
      { title: "Change Username / Password", href: "/loan", shortcut: "1" },
      { title: "Calculator", href: "/calculator", shortcut: "2" },
      { title: "Backup", href: "/Backup", shortcut: "3" },
    ],
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        router.push("/login");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const currentIndex = navItems.indexOf(selected);

    switch (event.key) {
      case "ArrowLeft":
        if (currentIndex > 0) {
          setSelected(navItems[currentIndex - 1]);
          setFocusedSubItem(0);
        }
        break;
      case "ArrowRight":
        if (currentIndex < navItems.length - 1) {
          setSelected(navItems[currentIndex + 1]);
          setFocusedSubItem(0);
        }
        break;
      case "ArrowUp":
        if (focusedSubItem > 0) {
          setFocusedSubItem((prev) => prev - 1);
        }
        break;
      case "ArrowDown":
        if (focusedSubItem < subNavItems[selected].length - 1) {
          setFocusedSubItem((prev) => prev + 1);
        }
        break;
      case "1":
      case "2":
      case "3":
      case "4":
        const index = parseInt(event.key) - 1;
        if (index < navItems.length) {
          setSelected(navItems[index]);
          setFocusedSubItem(0);
        }
        break;
      case "Enter":
        if (subNavItems[selected].length > 0) {
          const selectedSubItem = subNavItems[selected][focusedSubItem];
          window.location.href = selectedSubItem.href;
        }
        break;
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, focusedSubItem]);

  return (
    <div className={`bg-white shadow-lg ${ubuntu.className} dark:bg-gray-800 rounded-xl rounded-t-none`}>
      <nav className="relative">
        {/* Mobile Menu Button */}
        <button
          className="md:hidden absolute right-4 top-4 z-50"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <X className="w-8 rounded-lg fixed right-2 top-2.5 h-8 text-gray-600 dark:text-white bg-orange-200" />
          ) : (
            <Menu className="w-8 h-8 rounded-lg fixed right-2 top-2.5 text-gray-600 dark:text-white bg-orange-200" />
          )}
        </button>

        {/* Desktop Navigation */}
        <div className="hidden md:flex justify-between p-3">
          <div className="flex gap-6 md:gap-0">
            {navItems.map((item, index) => (
              <button
                key={item}
                onClick={() => {
                  setSelected(item);
                  setFocusedSubItem(0);
                }}
                className={`relative px-4 py-2 font-medium text-xl lg:text-3xl transition-all
                ${
                  selected === item
                    ? "text-orange-600 before:absolute before:bottom-0 before:left-0 before:h-0.5 before:w-full before:bg-orange-600"
                    : "text-gray-600 dark:text-white hover:text-orange-600 font-bold"
                }`}
              >
                <span className="mr-2 text-xl lg:text-3xl text-gray-400 dark:text-white">
                  {index + 1}
                </span>
                {item}
              </button>
            ))}
          </div>

          <div className="flex gap-2 lg:gap-6">
            <button
              onClick={handleLogout}
              className="px-3 lg:px-4 py-2 bg-orange-500 text-white text-base lg:text-xl hover:bg-red-600 transition-colors rounded-xl"
            >
              Logout
            </button>
            <button className="px-3 lg:px-4 py-2 bg-[#e8b903] text-base lg:text-xl text-white transition-colors rounded-xl">
              <Link href="/reset-credentials">Reset Password?</Link>
            </button>
            <span className="hidden xl:block"><TimeDisplay /></span>
          </div>
        </div>

        {/* Mobile Navigation - Grid Layout */}
        <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} p-4`}>
          <div className="grid grid-cols-2 gap-4">
            {navItems.map((item, index) => (
              <button
                key={item}
                onClick={() => {
                  setSelected(item);
                  setFocusedSubItem(0);
                  setIsMenuOpen(false);
                }}
                className={`relative px-4 py-3 font-medium text-lg transition-all rounded-lg border border-gray-200 dark:border-gray-700
                ${
                  selected === item
                    ? "text-orange-600 bg-orange-50 dark:bg-orange-900/20"
                    : "text-gray-600 dark:text-white hover:text-orange-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <span className="mr-2 text-lg text-gray-400 dark:text-gray-300">
                  {index + 1}
                </span>
                {item}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-orange-500 text-white text-lg hover:bg-red-600 transition-colors rounded-xl"
            >
              Logout
            </button>
            <button className="px-4 py-2 bg-[#e8b903] text-lg text-white transition-colors rounded-xl">
              <Link href="/reset-credentials">Reset Password?</Link>
            </button>
          </div>
        </div>
      </nav>

      {/* Subnav Items - Responsive */}
      <div className="p-4">
        {subNavItems[selected].length > 0 && (
          <ul className="space-y-2 border-l-2 border-orange-600 pl-4">
            {subNavItems[selected].map((item, index) => (
              <li
                key={item.href}
                className={`group text-base lg:text-xl flex items-center space-x-2 rounded-lg p-2 transition-colors dark:bg-gray-800
                  ${
                    focusedSubItem === index
                      ? "bg-orange-50 text-orange-600 dark:bg-orange-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
              >
                <Link
                  href={item.href}
                  className="flex-1 font-bold text-xl lg:text-2xl dark:text-gray-300"
                >
                  {item.title}
                </Link>
                <span className="text-sm text-gray-400 dark:text-white">
                  {item.shortcut}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}