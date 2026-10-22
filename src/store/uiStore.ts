import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
    expandedMenus: Record<string, boolean>;
    sidebarScrollTop: number;
    isDarkMode: boolean;
    userDarkModes: Record<string, boolean>;
    toggleMenu: (label: string) => void;
    setMenuExpanded: (label: string, expanded: boolean) => void;
    setSidebarScrollTop: (top: number) => void;
    toggleDarkMode: () => void;
    toggleUserDarkMode: (userId: string) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            expandedMenus: {},
            sidebarScrollTop: 0,
            isDarkMode: false, // fallback
            userDarkModes: {},
            toggleMenu: (label) => set((state) => ({
                expandedMenus: {
                    ...state.expandedMenus,
                    [label]: !state.expandedMenus[label]
                }
            })),
            setMenuExpanded: (label, expanded) => set((state) => ({
                expandedMenus: {
                    ...state.expandedMenus,
                    [label]: expanded
                }
            })),
            setSidebarScrollTop: (top) => set({ sidebarScrollTop: top }),
            toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
            toggleUserDarkMode: (userId) => set((state) => ({
                userDarkModes: {
                    ...state.userDarkModes,
                    [userId]: state.userDarkModes[userId] === undefined ? !state.isDarkMode : !state.userDarkModes[userId]
                }
            }))
        }),
        {
            name: 'rms-ui-state',
        }
    )
);
