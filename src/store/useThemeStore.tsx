import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  isDarkMode: boolean
  toggleTheme: () => void
  setTheme: (isDark: boolean) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleTheme: () => 
        set((state) => {
          const newTheme = !state.isDarkMode
          document.documentElement.classList.toggle('dark', newTheme)
          return { isDarkMode: newTheme }
        }),
      setTheme: (isDark: boolean) => 
        set(() => {
          document.documentElement.classList.toggle('dark', isDark)
          return { isDarkMode: isDark }
        }),
    }),
    {
      name: 'theme-storage',
    }
  )
)