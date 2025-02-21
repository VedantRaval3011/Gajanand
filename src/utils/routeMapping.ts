// src/utils/routeMapping.ts
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Define the mapping of routes to their parent nav items and positions
const routeToNavMapping: Record<string, { parent: string; index: number }> = {
  // Master routes
  '/loan': { parent: 'Master', index: 0 },
  '/saving': { parent: 'Master', index: 1 },
  '/master-file': { parent: 'Master', index: 2 },
  '/guaranter-master': { parent: 'Master', index: 3 },
  '/print-head': { parent: 'Master', index: 4 },
  '/keyboard-shortcut': { parent: 'Master', index: 5 },

  // Transaction routes
  '/collection-book': { parent: 'Transaction', index: 0 },
  '/day-book': { parent: 'Transaction', index: 1 },

  // Report routes
  '/payment-dashboard': { parent: 'Report', index: 0 },
  '/month-wise-yearly-collection': { parent: 'Report', index: 1 },
  '/loan-wedger': { parent: 'Report', index: 2 },
  '/deposit-ledger': { parent: 'Report', index: 3 },
  '/financial-statement': { parent: 'Report', index: 4 },
  '/crediter-or-depositor': { parent: 'Report', index: 5 },

  // Utilities routes
  '/change': { parent: 'Utilities', index: 0 }, // Change Username/Password
  '/calculator': { parent: 'Utilities', index: 1 },
  '/backup': { parent: 'Utilities', index: 2 },
};

interface UseNavigationProps {
  onEscape?: (parent: string, index: number) => void;
}

export const useNavigation = ({ onEscape }: UseNavigationProps) => {
  const router = useRouter();

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        
        // Get current path from window location
        const currentPath = window.location.pathname;
        
        // Find the mapping for current path
        const mapping = routeToNavMapping[currentPath];

        if (mapping) {
          // Call the escape handler with parent and index
          onEscape?.(mapping.parent, mapping.index);
        }
        
        // Navigate to home
        router.push("/");
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [router, onEscape]);
};

// Helper function to get nav item from route
export const getNavItemFromRoute = (route: keyof typeof routeToNavMapping) => {
  return routeToNavMapping[route];
};