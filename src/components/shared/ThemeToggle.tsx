'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { haptic } from '@/lib/haptic';

const themes: Array<{ value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'light', label: 'Светлая', icon: Sun },
  { value: 'dark', label: 'Темная', icon: Moon },
  { value: 'system', label: 'Системная', icon: Monitor },
];

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: Theme) => {
    haptic.light();
    setTheme(newTheme);
  };

  // Get current icon based on resolved theme
  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 transition-colors hover:bg-accent"
          aria-label="Сменить тему"
        >
          <CurrentIcon className="h-5 w-5 text-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-2 bg-popover border-border"
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-col gap-1">
          {themes.map(({ value, label, icon: Icon }) => {
            const isActive = theme === value;
            return (
              <button
                key={value}
                onClick={() => handleThemeChange(value)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md
                  transition-all
                  ${
                    isActive
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'text-foreground hover:bg-accent'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
