// File: src/stores/navigationStore.js
import { create } from "zustand";

interface NavigationState {
    selectedNavItem: string;
    focusedSubItemIndex: number;
    setSelectedNavItem: (navItem: string, subItemIndex?: number) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
    selectedNavItem: "Master",
    focusedSubItemIndex: 0,
    setSelectedNavItem: (navItem, subItemIndex = 0) =>
        set({ selectedNavItem: navItem, focusedSubItemIndex: subItemIndex }),
}));