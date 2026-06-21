import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
    expandedMenus: Record<string, boolean>;
    sidebarScrollTop: number;
    toggleMenu: (label: string) => void;
    setMenuExpanded: (label: string, expanded: boolean) => void;
    setSidebarScrollTop: (top: number) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            expandedMenus: {},
            sidebarScrollTop: 0,
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
            setSidebarScrollTop: (top) => set({ sidebarScrollTop: top })
        }),
        {
            name: 'rms-ui-state',
        }
    )
);
