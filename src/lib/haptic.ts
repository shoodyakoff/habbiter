export const haptic = {
  light: () => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  },

  medium: () => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
  },

  heavy: () => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
  },

  success: () => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
  },

  warning: () => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning');
  },

  error: () => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
  },
};

// Deprecated (for backward compatibility during migration)
export const triggerHaptic = haptic.light;
export const triggerSuccessHaptic = haptic.success;
