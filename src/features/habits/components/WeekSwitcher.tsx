'use client';

import React, { useState, useMemo } from 'react';
import { 
  format, isSameDay, isFuture, isToday, 
  startOfMonth, endOfMonth, eachDayOfInterval,
  addWeeks, subWeeks, addMonths, subMonths,
  startOfWeek, endOfWeek
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

interface DayProgress {
  date: string;
  status: 'complete' | 'partial' | 'low' | 'empty';
}

interface WeekSwitcherProps {
  className?: string;
  progressMap?: Record<string, DayProgress['status']>;
}

export const WeekSwitcher: React.FC<WeekSwitcherProps> = ({ 
  className,
  progressMap = {} 
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDateStr = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  const selectedDate = new Date(selectedDateStr);

  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [viewDate, setViewDate] = useState(selectedDate);

  const days = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(viewDate, { weekStartsOn: 1 });
      const end = endOfWeek(viewDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(viewDate);
      const end = endOfMonth(viewDate);
      return eachDayOfInterval({ start, end });
    }
  }, [viewMode, viewDate]);

  const handlePrev = () => {
    if (viewMode === 'week') {
      setViewDate(prev => subWeeks(prev, 1));
    } else {
      setViewDate(prev => subMonths(prev, 1));
    }
  };

  const handleNext = () => {
    // Prevent going into future if desired, but typically we allow navigating to see future plans?
    // User requirement: "calendar with navigation inside the week".
    // Usually we don't block navigation, just selection.
    if (viewMode === 'week') {
      setViewDate(prev => addWeeks(prev, 1));
    } else {
      setViewDate(prev => addMonths(prev, 1));
    }
  };

  const handleDayClick = (date: Date) => {
    if (isFuture(date) && !isSameDay(date, new Date())) return;

    const newDateStr = format(date, 'yyyy-MM-dd');
    const params = new URLSearchParams(searchParams);
    params.set('date', newDateStr);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const title = useMemo(() => {
    const monthName = format(viewDate, 'LLLL', { locale: ru });
    const year = format(viewDate, 'yyyy');
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
  }, [viewDate]);

  return (
    <div className={cn("w-full flex flex-col gap-3 mb-4", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
           <h2 className="text-lg font-bold text-foreground min-w-[140px]">
            {title}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-secondary/50 rounded-lg p-1 border border-border/50">
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                viewMode === 'week' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Неделя
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                viewMode === 'month' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Месяц
            </button>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={handlePrev}
              className="p-1.5 rounded-full hover:bg-secondary/80 text-foreground transition-colors"
            >
              <CaretLeft size={20} />
            </button>
            <button 
              onClick={handleNext}
              className="p-1.5 rounded-full hover:bg-secondary/80 text-foreground transition-colors"
            >
              <CaretRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Strip */}
      <div className={cn(
        "w-full overflow-x-auto no-scrollbar py-2",
        "bg-secondary/40 border border-border/50 rounded-2xl"
      )}>
        <div className="flex items-center min-w-full gap-1 px-2">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isSelected = selectedDateStr === dateStr;
            const isFutureDay = isFuture(day) && !isToday(day);
            const status = progressMap[dateStr] || 'empty';

            return (
              <button
                key={dateStr}
                onClick={() => handleDayClick(day)}
                disabled={isFutureDay}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[44px] h-[56px] rounded-xl transition-all duration-200 shrink-0",
                  isSelected 
                    ? "bg-primary text-primary-foreground shadow-md scale-100" 
                    : "bg-transparent hover:bg-background/50 text-foreground",
                  isFutureDay && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "text-xs font-medium mb-1 capitalize",
                  isSelected ? "text-primary-foreground" : "text-muted-foreground"
                )}>
                  {format(day, 'EEE', { locale: ru })}
                </span>
                <span className={cn(
                  "text-lg font-semibold leading-none",
                  isSelected ? "text-primary-foreground" : "text-foreground"
                )}>
                  {format(day, 'd')}
                </span>
                
                {/* Dot Indicator */}
                {!isFutureDay && (
                  <span className={cn(
                    "mt-1 w-1.5 h-1.5 rounded-full",
                    status === 'complete' && (isSelected ? "bg-white" : "bg-habit-green"),
                    status === 'partial' && (isSelected ? "bg-white/80" : "bg-habit-orange"),
                    status === 'low' && (isSelected ? "bg-white/60" : "bg-habit-red"),
                    status === 'empty' && "bg-transparent"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};