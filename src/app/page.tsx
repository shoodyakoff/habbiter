'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getToday, getWeekDays } from '@/lib/date';
import { WeekSwitcher } from '@/features/habits/components/WeekSwitcher';
import { TodayProgress } from '@/features/habits/components/TodayProgress';
import { HabitCard } from '@/features/habits/components/HabitCard';
import { EmptyState } from '@/features/habits/components/EmptyState';
import { HabitDetailDialog } from '@/features/habits/components/HabitDetailDialog';
import { FloatingActionButton } from '@/features/habits/components/FloatingActionButton';
import { useHabitsQuery, useHabitRecordsQuery, useHabitMutations, useWeekRecordsQuery } from '@/features/habits/api/useHabits';
import { Habit } from '@/features/habits/types/schema';
import { format } from 'date-fns';
import { getCardWidth } from '@/lib/layout';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDateStr = searchParams.get('date') || getToday();
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

  const { data: habits = [], isLoading } = useHabitsQuery();
  const { data: records = [] } = useHabitRecordsQuery(selectedDateStr);
  const { toggleHabit, archiveHabit } = useHabitMutations();

  const activeHabits = habits.filter(h => h.status === 'active');

  const completedCount = activeHabits.filter(h => 
    records.some(r => r.habitId === h.id && r.completed)
  ).length;

  const handleToggle = (id: string) => {
    toggleHabit.mutate({ id, date: selectedDateStr });
  };

  const handleArchive = (id: string) => {
    archiveHabit.mutate(id);
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

    if (activeHabits.length === 0) return map;

    weekDates.forEach(date => {
      const dayRecords = weekRecords.filter(r => r.date === date && r.completed);
      const dayCompletedCount = dayRecords.filter(r => 
        activeHabits.some(h => h.id === r.habitId)
      ).length;

      const total = activeHabits.length;
      const percentage = total > 0 ? (dayCompletedCount / total) : 0;
      
      const isPast = date < today;

      if (percentage === 1) {
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
  }, [weekDates, weekRecords, activeHabits]);

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

      {/* FAB for creating new habits */}
      <FloatingActionButton />

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
