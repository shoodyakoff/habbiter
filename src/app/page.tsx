'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getToday, getWeekDays } from '@/lib/date';
import { WeekSwitcher } from '@/features/habits/components/WeekSwitcher';
import { TodayProgress } from '@/features/habits/components/TodayProgress';
import { HabitCard } from '@/features/habits/components/HabitCard';
import { EmptyState } from '@/features/habits/components/EmptyState';
import { HabitDetailDialog } from '@/features/habits/components/HabitDetailDialog';
import { useHabitsQuery, useHabitRecordsQuery, useHabitMutations, useWeekRecordsQuery } from '@/features/habits/api/useHabits';
import { Habit } from '@/features/habits/types/schema';
import { format, getISODay } from 'date-fns';
import { getCardWidth } from '@/lib/layout';
import { isHabitScheduledOnDay } from '@/features/habits/utils/schedule';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDateStr = searchParams.get('date') || getToday();
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

  const { data: habits = [], isLoading } = useHabitsQuery();
  const { data: records = [] } = useHabitRecordsQuery(selectedDateStr);
  const { toggleHabit, archiveHabit } = useHabitMutations();

  // Фильтруем активные привычки по расписанию на выбранную дату
  const activeHabits = useMemo(() => {
    const selectedDate = new Date(selectedDateStr);
    const dayOfWeek = getISODay(selectedDate); // 1=Пн, 7=Вс (ISO-8601)

    return habits
      .filter(h => h.status === 'active')
      .filter(h => {
        // Проверяем, должна ли привычка быть запланирована на этот день
        return isHabitScheduledOnDay(
          h.frequency,
          h.repeatDays,
          dayOfWeek
        );
      });
  }, [habits, selectedDateStr]);

  const completedCount = activeHabits.filter(h =>
    records.some(r => r.habitId === h.id && r.completed)
  ).length;

  const handleToggle = (id: string) => {
    toggleHabit.mutate({ id, date: selectedDateStr });
  };

  const handleCardClick = (habit: Habit) => {
    setSelectedHabit(habit);
  };
  
  const handleEditHabit = (habit: Habit) => {
    router.push(`/habits/edit?id=${habit.id}`);
    setSelectedHabit(null);
  };

  const handleCreate = () => {
    router.push('/habits/new');
  };

  // Compute Week Progress
  const weekDays = useMemo(() => getWeekDays(new Date(selectedDateStr)), [selectedDateStr]);
  const weekDates = weekDays.map(d => format(d, 'yyyy-MM-dd'));
  const { data: weekRecords = [] } = useWeekRecordsQuery(weekDates);

  const progressMap = useMemo(() => {
    const map: Record<string, 'complete' | 'partial' | 'low' | 'empty' | 'failed'> = {};
    const today = format(new Date(), 'yyyy-MM-dd');

    const allActiveHabits = habits.filter(h => h.status === 'active');

    if (allActiveHabits.length === 0) return map;

    weekDates.forEach(date => {
      const dateObj = new Date(date);
      const dayOfWeek = getISODay(dateObj);

      // Фильтруем привычки, запланированные на этот день
      const scheduledHabits = allActiveHabits.filter(h =>
        isHabitScheduledOnDay(h.frequency, h.repeatDays, dayOfWeek)
      );

      const dayRecords = weekRecords.filter(r => r.date === date && r.completed);
      const dayCompletedCount = dayRecords.filter(r =>
        scheduledHabits.some(h => h.id === r.habitId)
      ).length;

      const total = scheduledHabits.length;
      const percentage = total > 0 ? (dayCompletedCount / total) : 0;

      const isPast = date < today;

      if (total === 0) {
        map[date] = 'empty'; // Нет запланированных привычек на этот день
      } else if (percentage === 1) {
        map[date] = 'complete';
      } else if (percentage >= 0.5) {
        map[date] = 'partial';
      } else if (percentage > 0) {
        map[date] = 'low';
      } else if (isPast && percentage === 0) {
        map[date] = 'failed';
      } else {
        map[date] = 'empty';
      }
    });
    return map;
  }, [weekDates, weekRecords, habits]);

  if (isLoading) {
    return <div className="p-4 text-center">Loading...</div>; // TODO: Skeleton
  }

  return (
    <div className="pb-24 min-h-screen bg-background">
      {/* HabitsHeader removed */}
      
      <WeekSwitcher 
        className="mb-6"
        progressMap={progressMap}
      />

      {activeHabits.length > 0 ? (
        <>
          <TodayProgress 
            total={activeHabits.length}
            completed={completedCount}
          />
          
          <div className="flex flex-wrap gap-3">
            {activeHabits.map((habit, index) => {
              const isCompleted = records.some(r => r.habitId === habit.id && r.completed);
              
              const gap = '0.75rem'; // gap-3
              const widthPercent = getCardWidth(index);

              return (
                <div 
                  key={habit.id} 
                  style={{ width: `calc(${widthPercent}% - (${gap} / 2))` }}
                >
                  <HabitCard
                    habit={habit}
                    completed={isCompleted}
                    onToggle={handleToggle}
                    onClick={handleCardClick}
                  />
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState onCreate={handleCreate} />
      )}

      {/* Detail Dialog */}
      <HabitDetailDialog 
        habit={selectedHabit}
        record={records.find(r => r.habitId === selectedHabit?.id) || null}
        date={selectedDateStr}
        isOpen={!!selectedHabit}
        onClose={() => setSelectedHabit(null)}
        onEdit={handleEditHabit}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
