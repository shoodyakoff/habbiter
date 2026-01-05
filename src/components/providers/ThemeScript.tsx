/**
 * Inline script to apply theme before React hydration
 * Prevents flash of wrong theme (FOUT)
 */
export function ThemeScript() {
  const themeScript = `
    (function() {
      function getStoredTheme() {
        try {
          const stored = localStorage.getItem('habiter-theme');
          if (stored) {
            return JSON.parse(stored).state?.theme || 'system';
          }
        } catch (e) {}
        return 'system';
      }

      function getTelegramTheme() {
        try {
          return window.Telegram?.WebApp?.colorScheme === 'dark' ? 'dark' : 'light';
        } catch (e) {}
        return null;
      }

      function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      function resolveTheme(theme) {
        if (theme === 'system') {
          return getTelegramTheme() || getSystemTheme();
        }
        return theme;
      }

      const theme = getStoredTheme();
      const resolvedTheme = resolveTheme(theme);
      document.documentElement.classList.add(resolvedTheme);
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeScript }}
      suppressHydrationWarning
    />
  );
}
