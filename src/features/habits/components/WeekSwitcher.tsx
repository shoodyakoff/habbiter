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
import { Button } from '@/components/ui/button';

interface DayProgress {
  date: string;
  status: 'complete' | 'partial' | 'low' | 'empty' | 'failed';
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

  const statusStyles = {
    complete: 'bg-green-500',
    partial: 'bg-yellow-500',
    low: 'bg-orange-500',
    failed: 'bg-red-500',
    empty: 'bg-muted' // or transparent
  };

  return (
    <div className={cn("w-full flex flex-col gap-3 mb-4", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
           <h2 className="text-lg font-bold text-foreground min-w-[140px]">
            {title}
          </h2>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1 mr-4">
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode('week')}
            >
              Неделя
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode('month')}
            >
              Месяц
            </Button>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="size-7"
              onClick={handlePrev}
            >
              <CaretLeft size={16} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="size-7"
              onClick={handleNext}
            >
              <CaretRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Strip */}
      <div className={cn(
        "w-full overflow-x-auto no-scrollbar py-2",
        "bg-secondary/40 border border-border/50 rounded-2xl"
      )}>
        <div className={cn(
          "flex items-center min-w-full gap-1 px-2",
          viewMode === 'week' ? "justify-between" : ""
        )}>
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
                  "flex flex-col items-center justify-center h-[56px] rounded-xl transition-all duration-200 shrink-0",
                  viewMode === 'week' ? "flex-1 min-w-0" : "min-w-[44px]",
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
                  {format(day, 'EEEEEE', { locale: ru })}
                </span>
                <span className={cn(
                  "text-lg font-semibold leading-none",
                  isSelected ? "text-primary-foreground" : "text-foreground"
                )}>
                  {format(day, 'd')}
                </span>
                
                {/* Dot Indicator */}
                {!isFutureDay && (
                  <div className={cn(
                    "mt-1 w-1.5 h-1.5 rounded-full",
                    isSelected && status !== 'empty' ? "bg-white" : statusStyles[status],
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
