'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getToday, getWeekDays } from '@/lib/date';
import { HabitsHeader } from '@/features/habits/components/HabitsHeader';
import { WeekSwitcher } from '@/features/habits/components/WeekSwitcher';
import { TodayProgress } from '@/features/habits/components/TodayProgress';
import { HabitCard } from '@/features/habits/components/HabitCard';
import { EmptyState } from '@/features/habits/components/EmptyState';
import { CreateHabitForm } from '@/features/habits/components/CreateHabitForm';
import { HabitDetailDialog } from '@/features/habits/components/HabitDetailDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useHabitsQuery, useHabitRecordsQuery, useHabitMutations, useWeekRecordsQuery } from '@/features/habits/api/useHabits';
import { Habit } from '@/features/habits/types/schema';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';
import { triggerSuccessHaptic } from '@/lib/haptic';

function HomeContent() {
  const searchParams = useSearchParams();
  const selectedDateStr = searchParams.get('date') || getToday();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const { data: habits = [], isLoading } = useHabitsQuery();
  const { data: records = [] } = useHabitRecordsQuery(selectedDateStr);
  const { toggleHabit, archiveHabit } = useHabitMutations();

  const activeHabits = habits.filter(h => h.status === 'active');

  // Track previous completion percentage to trigger confetti only on crossing 100%
  // Simple version: check inside toggle logic or effect.
  // Using effect is easier but requires tracking previous state.
  
  const completedCount = activeHabits.filter(h => 
    records.some(r => r.habitId === h.id && r.completed)
  ).length;
  
  const total = activeHabits.length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  
  React.useEffect(() => {
    if (percentage === 100 && total > 0) {
      triggerSuccessHaptic();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [percentage, total]);

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
    setEditingHabit(habit);
    setSelectedHabit(null);
  };

  // Compute Week Progress
  const weekDays = useMemo(() => getWeekDays(new Date(selectedDateStr)), [selectedDateStr]);
  const weekDates = weekDays.map(d => format(d, 'yyyy-MM-dd'));
  const { data: weekRecords = [] } = useWeekRecordsQuery(weekDates);

  const progressMap = useMemo(() => {
    const map: Record<string, 'complete' | 'partial' | 'low' | 'empty'> = {};
    if (activeHabits.length === 0) return map;

    weekDates.forEach(date => {
      const dayRecords = weekRecords.filter(r => r.date === date && r.completed);
      // We only care about records for active habits
      // Note: If a habit was created LATER, it shouldn't count for past?
      // For MVP, we assume habits exist always.
      const dayCompletedCount = dayRecords.filter(r => 
        activeHabits.some(h => h.id === r.habitId)
      ).length;

      const total = activeHabits.length;
      const percentage = total > 0 ? (dayCompletedCount / total) : 0;

      if (percentage === 1) map[date] = 'complete';
      else if (percentage >= 0.5) map[date] = 'partial';
      else if (percentage > 0) map[date] = 'low';
      else map[date] = 'empty';
    });
    return map;
  }, [weekDates, weekRecords, activeHabits]);

  if (isLoading) {
    return <div className="p-4 text-center">Loading...</div>; // TODO: Skeleton
  }

  return (
    <div className="pb-24 min-h-screen bg-background">
      <HabitsHeader />
      
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
              
              // Asymmetric grid logic: 60/40, 30/70, 50/50
              const position = index % 6;
              const gap = '0.75rem'; // gap-3
              let widthPercent = 50;

              switch (position) {
                case 0: widthPercent = 60; break;
                case 1: widthPercent = 40; break;
                case 2: widthPercent = 30; break;
                case 3: widthPercent = 70; break;
                case 4: widthPercent = 50; break;
                case 5: widthPercent = 50; break;
              }

              return (
                <div 
                  key={habit.id} 
                  style={{ width: `calc(${widthPercent}% - (${gap} / 2))` }}
                >
                  <HabitCard
                    habit={habit}
                    completed={isCompleted}
                    onToggle={handleToggle}
                    onArchive={handleArchive}
                    onClick={handleCardClick}
                  />
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState onCreate={() => setIsCreateOpen(true)} />
      )}

      {/* Create Habit Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md max-h-[calc(100vh-40px)] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Создать привычку</DialogTitle>
          </DialogHeader>
          <CreateHabitForm onSuccess={() => setIsCreateOpen(false)} className="flex-1 overflow-y-auto p-6 pt-2" />
        </DialogContent>
      </Dialog>

      {/* Edit Habit Dialog */}
      <Dialog open={!!editingHabit} onOpenChange={(open) => !open && setEditingHabit(null)}>
        <DialogContent className="sm:max-w-md max-h-[calc(100vh-40px)] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Редактирование привычки</DialogTitle>
          </DialogHeader>
          <CreateHabitForm 
            habitId={editingHabit?.id}
            initialValues={editingHabit || undefined}
            onSuccess={() => setEditingHabit(null)}
            className="flex-1 overflow-y-auto p-6 pt-2"
          />
        </DialogContent>
      </Dialog>

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
