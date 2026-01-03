import { format, subDays, addDays, startOfWeek, getHours } from 'date-fns';
import { ru } from 'date-fns/locale';

export const getToday = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const getYesterday = (): string => {
  return format(subDays(new Date(), 1), 'yyyy-MM-dd');
};

export const formatDate = (date: Date | string): string => {
  return format(new Date(date), 'yyyy-MM-dd');
};

export const formatDateForHeader = (date: Date = new Date()): string => {
  const str = format(date, 'EEEE, d MMMM yyyy', { locale: ru });
  // Capitalize first letter (day of week)
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getGreeting = (): string => {
  const hours = getHours(new Date());
  if (hours >= 6 && hours < 12) return 'Доброе утро';
  if (hours >= 12 && hours < 18) return 'Добрый день';
  if (hours >= 18 && hours <= 23) return 'Добрый вечер';
  return 'Доброй ночи';
};

export const getWeekDays = (baseDate: Date = new Date()): Date[] => {
  // Start from Monday of the current week
  const start = startOfWeek(baseDate, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};
