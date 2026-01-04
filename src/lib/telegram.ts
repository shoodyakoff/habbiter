export function initTelegramWebApp() {
  if (typeof window === 'undefined') return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tg = (window as any).Telegram?.WebApp;
  if (!tg) return;

  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation();
  
  if (tg.themeParams) {
    tg.setHeaderColor(tg.themeParams.bg_color || '#FFFFFF');
    tg.setBackgroundColor(tg.themeParams.bg_color || '#FFFFFF');
  }
}
