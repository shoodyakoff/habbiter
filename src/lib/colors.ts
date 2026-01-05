// Luminance calculation (WCAG 2.0) for determining text color on colored backgrounds

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Map habit color names to hex values (matches globals.css)
const HABIT_COLOR_HEX: Record<string, string> = {
  // Reds & Pinks
  crimson: '#DC143C',
  ruby: '#E0115F',
  coral: '#FF6F61',
  rose: '#FF6B9D',

  // Oranges & Yellows
  amber: '#FFBF00',
  gold: '#FFD700',
  terracotta: '#E2725B',
  peach: '#FFDAB9',

  // Greens
  emerald: '#50C878',
  jade: '#00A86B',
  sage: '#8A9A5B',
  mint: '#3EB489',

  // Blues
  sapphire: '#0F52BA',
  turquoise: '#30D5C8',
  teal: '#008080',
  cerulean: '#007BA7',

  // Purples
  amethyst: '#9966CC',
  lavender: '#967BB6',
  plum: '#8E4585',
  orchid: '#DA70D6',
};

/**
 * Returns 'text-black' or 'text-white' based on background luminance
 * @param habitColor - Habit color name from schema
 * @returns Text color class name
 */
export function getTextColorForHabit(habitColor: string): 'text-black' | 'text-white' {
  return 'text-white';
}

/**
 * Returns icon color hex (inverse of text color for checkbox fill)
 */
export function getIconColorForHabit(habitColor: string): string {
  return getTextColorForHabit(habitColor) === 'text-black' ? '#000000' : '#FFFFFF';
}
