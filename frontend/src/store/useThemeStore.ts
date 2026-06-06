import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ThemeConfig {
  id: string;
  name: string;
  colors: {
    brand: string;
    brandLight: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    sidebar: string;
    sidebarText: string;
  };
  chartColors: string[];
}

export const builtInThemes: ThemeConfig[] = [
  {
    id: 'indigo',
    name: 'Indigo (Default)',
    colors: {
      brand: '#6366F1',
      brandLight: '#EEF2FF',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#1E293B',
      textSecondary: '#64748B',
      border: '#E2E8F0',
      sidebar: '#0F172A',
      sidebarText: '#CBD5E1',
    },
    chartColors: ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'],
  },
  {
    id: 'emerald',
    name: 'Emerald',
    colors: {
      brand: '#10B981',
      brandLight: '#ECFDF5',
      background: '#F0FDF4',
      surface: '#FFFFFF',
      text: '#1E293B',
      textSecondary: '#64748B',
      border: '#D1FAE5',
      sidebar: '#064E3B',
      sidebarText: '#A7F3D0',
    },
    chartColors: ['#10B981', '#34D399', '#6EE7B7', '#059669', '#047857', '#065F46'],
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: {
      brand: '#F43F5E',
      brandLight: '#FFF1F2',
      background: '#FFF1F2',
      surface: '#FFFFFF',
      text: '#1E293B',
      textSecondary: '#64748B',
      border: '#FECDD3',
      sidebar: '#4C0519',
      sidebarText: '#FDA4AF',
    },
    chartColors: ['#F43F5E', '#FB7185', '#FDA4AF', '#E11D48', '#BE123C', '#9F1239'],
  },
  {
    id: 'amber',
    name: 'Amber',
    colors: {
      brand: '#F59E0B',
      brandLight: '#FFFBEB',
      background: '#FFFBEB',
      surface: '#FFFFFF',
      text: '#1E293B',
      textSecondary: '#64748B',
      border: '#FDE68A',
      sidebar: '#451A03',
      sidebarText: '#FCD34D',
    },
    chartColors: ['#F59E0B', '#FBBF24', '#FCD34D', '#D97706', '#B45309', '#92400E'],
  },
  {
    id: 'violet',
    name: 'Violet',
    colors: {
      brand: '#8B5CF6',
      brandLight: '#F5F3FF',
      background: '#F5F3FF',
      surface: '#FFFFFF',
      text: '#1E293B',
      textSecondary: '#64748B',
      border: '#DDD6FE',
      sidebar: '#2E1065',
      sidebarText: '#C4B5FD',
    },
    chartColors: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#7C3AED', '#6D28D9', '#5B21B6'],
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    colors: {
      brand: '#818CF8',
      brandLight: '#1E1B4B',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F1F5F9',
      textSecondary: '#94A3B8',
      border: '#334155',
      sidebar: '#020617',
      sidebarText: '#94A3B8',
    },
    chartColors: ['#818CF8', '#A78BFA', '#F472B6', '#FBBF24', '#34D399', '#60A5FA'],
  },
];

interface ThemeState {
  activeThemeId: string;
  mode: 'light' | 'dark';
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  setTheme: (themeId: string) => void;
  toggleMode: () => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setMobileSidebar: (open: boolean) => void;
  getActiveTheme: () => ThemeConfig;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      activeThemeId: 'indigo',
      mode: 'light',
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      toggleMobileSidebar: () => set({ mobileSidebarOpen: !get().mobileSidebarOpen }),
      setMobileSidebar: (open: boolean) => set({ mobileSidebarOpen: open }),
      
      toggleMode: () => {
        const newMode = get().mode === 'light' ? 'dark' : 'light';
        set({ mode: newMode });
        
        // Toggle Tailwind dark class on HTML root
        const root = document.documentElement;
        if (newMode === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      },

      setTheme: (themeId) => {
        set({ activeThemeId: themeId });
        // Apply CSS variables to :root
        const theme = builtInThemes.find((t) => t.id === themeId);
        if (theme) {
          const root = document.documentElement;
          root.style.setProperty('--color-brand', theme.colors.brand);
          root.style.setProperty('--color-brand-light', theme.colors.brandLight);
          root.style.setProperty('--color-sidebar-bg', theme.colors.sidebar);
          root.style.setProperty('--color-sidebar-text', theme.colors.sidebarText);
        }
      },
      getActiveTheme: () => {
        return builtInThemes.find((t) => t.id === get().activeThemeId) || builtInThemes[0];
      },
    }),
    { 
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Hydrate HTML class immediately upon store load
        if (state) {
          const root = document.documentElement;
          if (state.mode === 'dark') {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
          
          const theme = builtInThemes.find((t) => t.id === state.activeThemeId) || builtInThemes[0];
          root.style.setProperty('--color-brand', theme.colors.brand);
          root.style.setProperty('--color-brand-light', theme.colors.brandLight);
          root.style.setProperty('--color-sidebar-bg', theme.colors.sidebar);
          root.style.setProperty('--color-sidebar-text', theme.colors.sidebarText);
        }
      }
    }
  )
);
