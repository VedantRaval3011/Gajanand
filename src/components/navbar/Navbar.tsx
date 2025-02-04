"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import ToggleSwitch from "./toggleSwitch/ToggleSwitch";
import { Ubuntu } from "next/font/google";


type NavItem = "Master" | "Transaction" | "Report" | "Utilities";
type SubNavItem = {
  title: string;
  href: string;
  shortcut: string;
};

const ubuntu = Ubuntu({
  weight: '400',
  subsets: ['latin'],
})

export default function Navbar() {
  const [selected, setSelected] = useState<NavItem>("Master");
  const [focusedSubItem, setFocusedSubItem] = useState<number>(0);
  const navItems: NavItem[] = ["Master", "Transaction", "Report", "Utilities"];

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
      { title: "B-6", href: "/loan", shortcut: "1" },
      {
        title: "Month Wise Yearly Collection",
        href: "/month-wise-yearly-collection",
        shortcut: "2",
      },
      { title: "Loan Wedger", href: "/loan-wedger", shortcut: "3" },
      { title: "Deposit Ledger", href: "/deposit-ledger", shortcut: "4" },
      {
        title: "Financial statement",
        href: "/financial-statement",
        shortcut: "5",
      },
      {
        title: "Crediter/Depositer",
        href: "/crediter-or-depositor",
        shortcut: "6",
      },
    ],
    Utilities: [
      { title: "Change Username / Password", href: "/loan", shortcut: "1" },
      { title: "Calculator", href: "/calculator", shortcut: "2" },
      { title: "Backup", href: "/Backup", shortcut: "3" },
    ],
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
    <div className={` bg-white shadow-lg ${ubuntu.className} dark:bg-gray-800 rounded-xl rounded-t-none `}>
      <nav className="flex justify-between p-3 ">
        <div className="flex gap-6">
          {navItems.map((item, index) => (
            <button
              key={item}
              onClick={() => {
                setSelected(item);
                setFocusedSubItem(0);
              }}
              className={`relative px-4 py-2 font-medium text-2xl transition-all
              ${
                selected === item
                  ? "text-orange-600 before:absolute before:bottom-0 before:left-0 before:h-0.5 before:w-full before:bg-orange-600 "
                  : "text-gray-600 dark:text-white hover:text-orange-600"
              }`}
            >
              <span className="mr-2 text-lg text-gray-400 dark:text-white">{index + 1}</span>
              {item}
            </button>
          ))}
        </div>
        <ToggleSwitch />
      </nav>

      <div className="p-4">
        {subNavItems[selected].length > 0 && (
          <ul className="space-y-2 border-l-2 border-orange-600 pl-4">
            {subNavItems[selected].map((item, index) => (
              <li
                key={item.href}
                className={`group text-lg  flex items-center space-x-2 rounded-lg p-2 transition-colors dark:bg-gray-800
                  ${
                    focusedSubItem === index
                      ? "bg-orange-50 text-orange-600 dark:bg-orange-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
              >
                <Link href={item.href} className="flex-1 dark:text-gray-300">
                  {item.title}
                </Link>
                <span className="text-sm text-gray-400 dark:text-white">{item.shortcut}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
