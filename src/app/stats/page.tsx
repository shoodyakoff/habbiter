'use client';

import React, { useState, useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isFuture,
  isToday,
  isSameDay,
  getISODay
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { CaretLeft, CaretRight, ChartBar, Info } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { getIcon } from '@/components/shared/Icon/IconCatalog';
import { useHabitsQuery, useWeekRecordsQuery } from '@/features/habits/api/useHabits';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { isHabitScheduledOnDay } from '@/features/habits/utils/schedule';

export default function StatsPage() {
  // 1. State: Selected Date (defaults to today)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // 2. Derived State: Week calculation
  const { weekDays, weekStart, weekEnd, weekDatesStrings } = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const datesStrings = days.map(d => format(d, 'yyyy-MM-dd'));
    
    return { 
      weekDays: days, 
      weekStart: start, 
      weekEnd: end,
      weekDatesStrings: datesStrings
    };
  }, [currentDate]);

  // 3. Data Fetching
  const { data: habits, isLoading: isHabitsLoading } = useHabitsQuery();
  const { data: records, isLoading: isRecordsLoading } = useWeekRecordsQuery(weekDatesStrings);

  // 4. Handlers
  const handlePrevWeek = () => {
    haptic.light();
    setCurrentDate(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    haptic.light();
    setCurrentDate(prev => addWeeks(prev, 1));
  };

  const isCurrentWeek = useMemo(() => {
    return isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, [weekStart]);

  const title = useMemo(() => {
    const startStr = format(weekStart, 'd MMM', { locale: ru });
    const endStr = format(weekEnd, 'd MMM', { locale: ru });
    return `${startStr} - ${endStr}`;
  }, [weekStart, weekEnd]);

  // 5. Render Helpers
  const isLoading = isHabitsLoading || isRecordsLoading;
  const activeHabits = habits?.filter(h => h.status === 'active') || [];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-[calc(4rem+env(safe-area-inset-bottom))]">
      {/* Header & Controls */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Статистика</h1>

          <div className="flex items-center gap-2">
            {/* Help Dialog */}
            <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Помощь"
                >
                  <Info size={16} />
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Метод Франклина</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-foreground leading-relaxed">
                    Метод Франклина основан на подходе Бенджамина Франклина из его автобиографии.
                    Он сосредотачивался на одной из 13 добродетелей в неделю, отслеживая их соблюдение
                    путём пометки непройденных дней красной точкой. Это создаёт визуальный стимул — вы хотите
                    видеть «чистую строку» без точек, то есть полную неделю без ошибок. Пустое поле означает успех
                    (привычка выполнена), красная точка (●) означает пропуск (привычка не выполнена).
                    Этот метод помогает развивать самодисциплину через визуальное отслеживание прогресса.
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            {/* Week navigation */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrevWeek}
              >
                <CaretLeft size={16} />
              </Button>

              <span className="text-xs font-medium min-w-[90px] text-center tabular-nums">
                {title}
              </span>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNextWeek}
                disabled={isCurrentWeek && isFuture(addWeeks(new Date(), 1))}
              >
                <CaretRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full overflow-x-hidden">
        {isLoading ? (
          <StatsSkeleton />
        ) : activeHabits.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {/* Grid Header: Days */}
            <div className="grid grid-cols-[70px_repeat(7,1fr)] gap-1 mb-2">
              <div className="w-[70px]"></div> {/* Spacer for habit icon */}
              {weekDays.map((day, i) => (
                <div key={i} className="flex flex-col items-center justify-center text-muted-foreground">
                  <span className="text-[10px] font-medium capitalize">
                    {format(day, 'EE', { locale: ru })}
                  </span>
                  <span className={cn(
                    "text-xs font-bold",
                    isToday(day) && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid Body: Habits */}
            <div className="space-y-4">
              <AnimatePresence mode='wait'>
                <motion.div
                  key={weekStart.toISOString()}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {activeHabits.map((habit) => {
                    const Icon = getIcon(habit.icon || '');
                    
                    return (
                      <div key={habit.id} className="grid grid-cols-[70px_repeat(7,1fr)] gap-1 items-center min-h-[44px]">
                        {/* Habit Info */}
                        <div className="flex flex-col items-start justify-center gap-1 overflow-hidden pl-1">
                          <div 
                            className="flex-shrink-0 size-8 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: `var(--color-habit-${habit.color})` }}
                          >
                            <Icon size={16} weight="fill" />
                          </div>
                          <span className="text-[10px] leading-none font-medium truncate w-full text-left px-0.5">{habit.name}</span>
                        </div>

                        {/* Days Cells */}
                        {weekDays.map((day) => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const dayOfWeek = getISODay(day); // 1=Пн, 7=Вс (ISO-8601)

                          // Проверяем, была ли привычка запланирована на этот день
                          const wasScheduled = isHabitScheduledOnDay(
                            habit.frequency,
                            habit.repeatDays,
                            dayOfWeek
                          );

                          // Если не запланирована - пустая клетка
                          if (!wasScheduled) return <div key={dateStr} />;

                          // Logic для запланированных дней:
                          // 1. Future -> Empty
                          if (isFuture(day) && !isToday(day)) return <div key={dateStr} />;

                          // 2. Today -> Small dot (give chance)
                          if (isToday(day)) return <div key={dateStr} className="flex justify-center"><div className="size-1 rounded-full bg-muted" /></div>;

                          // 3. Past
                          const record = records?.find(r => r.habitId === habit.id && r.date === dateStr);
                          const isCompleted = record?.completed;

                          // Success -> Empty
                          if (isCompleted) return <div key={dateStr} />;

                          // Failure -> Red dot (привычка была запланирована, но не выполнена)
                          return (
                            <div key={dateStr} className="flex items-center justify-center">
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="size-2 rounded-full bg-destructive"
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
        
        {/* Legend / Info */}
        {!isLoading && activeHabits.length > 0 && (
            <div className="mt-8 text-center">
                <p className="text-xs text-muted-foreground">
                    Пустое поле = Успех
                    <span className="mx-2"> | </span>
                    <span className="text-destructive font-bold">●</span> = Пропуск
                </p>
            </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
      <div className="p-4 bg-muted/50 rounded-full">
        <ChartBar size={32} className="text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Нет данных</h3>
        <p className="text-sm text-muted-foreground max-w-[250px]">
          Создайте привычки и начните их выполнять, чтобы увидеть статистику.
        </p>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between mb-4">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="w-8 h-8 bg-muted rounded-md animate-pulse" />
        ))}
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="size-8 bg-muted rounded-lg animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
             <div className="h-8 bg-muted/50 rounded-md animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
