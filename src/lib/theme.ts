import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  initTheme: () => void;
}

// Get Telegram theme preference
function getTelegramTheme(): 'light' | 'dark' | null {
  if (typeof window === 'undefined') return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tg = (window as any).Telegram?.WebApp;
  if (!tg?.colorScheme) return null;

  return tg.colorScheme === 'dark' ? 'dark' : 'light';
}

// Get system theme preference
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Resolve theme based on user preference
function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    // Prefer Telegram theme, fallback to system
    return getTelegramTheme() || getSystemTheme();
  }
  return theme;
}

// Apply theme to document
function applyTheme(resolvedTheme: 'light' | 'dark') {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);

  // Sync with Telegram WebApp colors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tg = (window as any).Telegram?.WebApp;
  if (tg) {
    const bgColor = resolvedTheme === 'dark' ? '#111827' : '#FFFFFF';
    tg.setHeaderColor(bgColor);
    tg.setBackgroundColor(bgColor);
  }
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',

      setTheme: (theme: Theme) => {
        const resolvedTheme = resolveTheme(theme);
        applyTheme(resolvedTheme);
        set({ theme, resolvedTheme });
      },

      initTheme: () => {
        const { theme } = get();
        const resolvedTheme = resolveTheme(theme);
        applyTheme(resolvedTheme);
        set({ resolvedTheme });

        // Listen for system theme changes
        if (typeof window !== 'undefined') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handleChange = () => {
            const currentTheme = get().theme;
            if (currentTheme === 'system') {
              const newResolvedTheme = resolveTheme('system');
              applyTheme(newResolvedTheme);
              set({ resolvedTheme: newResolvedTheme });
            }
          };

          mediaQuery.addEventListener('change', handleChange);
          return () => mediaQuery.removeEventListener('change', handleChange);
        }
      },
    }),
    {
      name: 'habiter-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
