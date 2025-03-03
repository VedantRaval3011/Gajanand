import { create } from "zustand";

interface ThemeStore {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDarkMode: false, // Default mode
  toggleDarkMode: () => set((state) => {
    const newMode = !state.isDarkMode;
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", newMode ? "dark" : "light");
      document.documentElement.classList.toggle("dark", newMode);
    }
    return { isDarkMode: newMode };
  }),
  setDarkMode: (value: boolean) => set(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", value ? "dark" : "light");
      document.documentElement.classList.toggle("dark", value);
    }
    return { isDarkMode: value };
  }),
}));
