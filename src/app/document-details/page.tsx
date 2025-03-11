// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Toaster, toast } from "react-hot-toast";
import ChequeForm from "@/components/chequeForm/ChequeForm";
import ChequeList from "@/components/chequeList/ChequeList";
import type { Cheque } from "@/types/cheque";
import { useNavigationStore } from "@/store/NavigationStore";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);
  const setSelectedNavItem = useNavigationStore(
    (state) => state.setSelectedNavItem
  );
  const router = useRouter();

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

  const toggleDarkMode = () => {
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        toggleDarkMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/");
        setSelectedNavItem("Master", 3);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    fetchCheques();
  }, []);

  const fetchCheques = async () => {
    try {
      const response = await fetch("/api/cheques");
      if (!response.ok) throw new Error("Failed to fetch cheques");
      const data = await response.json();
      setCheques(data);
    } catch (error) {
      console.error("Error fetching cheques:", error);
      toast.error("Failed to load cheques");
    }
  };

  const addCheque = async (cheque: Omit<Cheque, "_id">) => {
    try {
      const response = await fetch("/api/cheques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cheque),
      });
      if (!response.ok) throw new Error("Failed to add cheque");
      const newCheque = await response.json();
      setCheques([...cheques, newCheque]);
      toast.success("Cheque added successfully!");
    } catch (error) {
      console.error("Error adding cheque:", error);
      toast.error("Failed to add cheque");
    }
  };

  const updateCheque = async (id: string, chequeData: Partial<Cheque>) => {
    try {
      const response = await fetch(`/api/cheques/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chequeData),
      });
      if (!response.ok) throw new Error("Failed to update cheque");
      const updatedCheque = await response.json();
      setCheques(
        cheques.map((cheque) => (cheque._id === id ? updatedCheque : cheque))
      );
      setEditingCheque(null);
      toast.success("Cheque updated successfully!");
    } catch (error) {
      console.error("Error updating cheque:", error);
      toast.error("Failed to update cheque");
    }
  };

  const deleteCheque = async (id: string) => {
    try {
      const response = await fetch(`/api/cheques/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete cheque");
      setCheques(cheques.filter((cheque) => cheque._id !== id));
      toast.success("Cheque deleted successfully!");
    } catch (error) {
      console.error("Error deleting cheque:", error);
      toast.error("Failed to delete cheque");
    }
  };

  return (
    <main className="min-h-screen bg-orange-50 dark:bg-gray-900 py-10 transition-colors duration-300">
      <Toaster position="top-right" />
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4"
      >
        <div className="flex justify-between items-center mb-8 uppercase">
          <h1 className="text-2xl font-bold text-orange-600 dark:text-orange-400 text-center flex justify-center gap-3 items-center w-full">
            <div className="cursor-pointer hover:scale-110 transition-transform">
              {isDarkMode ? (
                <Image
                  src="/GFLogo.png"
                  alt="logo"
                  height={50}
                  width={50}
                  className="w-10 drop-shadow-[0_0_0_0.5] transition-opacity cursor-pointer"
                  onClick={() => router.push("/")}
                />
              ) : (
                <Image
                  src="/lightlogo.png"
                  alt="logo"
                  height={50}
                  width={50}
                  className="w-10 drop-shadow-[0_0_0_0.5] transition-opacity cursor-pointer"
                  onClick={() => router.push("/")}
                />
              )}
            </div>
            Manage Cheques
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
          >
            <h2 className="text-2xl font-semibold text-orange-500 dark:text-orange-400 mb-6">
              {editingCheque ? "Edit Cheque" : "Add New Cheque"}
            </h2>
            <ChequeForm
              onSubmit={addCheque}
              onUpdate={updateCheque}
              cheque={editingCheque}
              onCancel={() => setEditingCheque(null)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
          >
            <h2 className="text-2xl font-semibold text-orange-500 dark:text-orange-400 mb-6">
              Recorded Cheques
            </h2>
            <ChequeList
              cheques={cheques}
              onEdit={setEditingCheque}
              onDelete={deleteCheque}
            />
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
