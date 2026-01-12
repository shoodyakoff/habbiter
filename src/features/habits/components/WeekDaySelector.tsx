'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WeekDaySelectorProps {
  value: number[];
  onChange: (days: number[]) => void;
  className?: string;
}

// ISO-8601: 1=Понедельник, 7=Воскресенье
const WEEKDAYS = [
  { value: 1, label: 'Пн', fullLabel: 'Понедельник' },
  { value: 2, label: 'Вт', fullLabel: 'Вторник' },
  { value: 3, label: 'Ср', fullLabel: 'Среда' },
  { value: 4, label: 'Чт', fullLabel: 'Четверг' },
  { value: 5, label: 'Пт', fullLabel: 'Пятница' },
  { value: 6, label: 'Сб', fullLabel: 'Суббота' },
  { value: 7, label: 'Вс', fullLabel: 'Воскресенье' },
] as const;

/**
 * Компонент для выбора дней недели
 *
 * Использует ISO-8601 стандарт: 1=Понедельник, 7=Воскресенье
 *
 * @example
 * <WeekDaySelector
 *   value={[1, 3, 5]} // Пн, Ср, Пт
 *   onChange={(days) => console.log(days)}
 * />
 */
export const WeekDaySelector = ({ value, onChange, className }: WeekDaySelectorProps) => {
  const toggleDay = (day: number) => {
    if (value.includes(day)) {
      // Убираем день из списка
      const newDays = value.filter(d => d !== day);
      onChange(newDays);
    } else {
      // Добавляем день, сохраняя сортировку
      const newDays = [...value, day].sort((a, b) => a - b);
      onChange(newDays);
    }
  };

  return (
    <div className={cn("grid grid-cols-7 gap-2", className)}>
      {WEEKDAYS.map((day) => {
        const isSelected = value.includes(day.value);

        return (
          <motion.button
            key={day.value}
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => toggleDay(day.value)}
            className={cn(
              "aspect-square rounded-2xl flex flex-col items-center justify-center transition-all",
              isSelected
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-white dark:bg-card text-muted-foreground hover:bg-muted border border-border/40 shadow-sm"
            )}
            aria-label={`${day.fullLabel}${isSelected ? ' (выбран)' : ''}`}
            aria-pressed={isSelected}
          >
            <span className={cn(
              "text-sm font-semibold",
              isSelected && "text-primary-foreground"
            )}>
              {day.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};
