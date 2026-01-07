'use client';

import { useState } from 'react';
import { useHabitsQuery, useHabitMutations } from '@/features/habits/api/useHabits';
import { CaretRight, Archive } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getTextColorForHabit } from '@/lib/colors';
import { getIcon } from '@/components/shared/Icon/IconCatalog';
import { FloatingActionButton } from '@/features/habits/components/FloatingActionButton';
import { ArchiveHabitDialog } from '@/features/habits/components/ArchiveHabitDialog';
import { cn } from '@/lib/utils';

export default function MyHabitsPage() {
  const router = useRouter();
  const { data: habits = [], isLoading } = useHabitsQuery();
  const { archiveHabit } = useHabitMutations();

  const [archiveDialogState, setArchiveDialogState] = useState<{
    open: boolean;
    habitId: string | null;
    habitName: string;
  }>({
    open: false,
    habitId: null,
    habitName: '',
  });

  const activeHabits = habits.filter(h => h.status === 'active');

  const handleArchiveClick = (e: React.MouseEvent, habitId: string, habitName: string) => {
    e.stopPropagation();
    setArchiveDialogState({
      open: true,
      habitId,
      habitName,
    });
  };

  const handleArchiveConfirm = () => {
    if (archiveDialogState.habitId) {
      archiveHabit.mutate(archiveDialogState.habitId);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  return (
    <div className="pb-24 px-4 pt-6 min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Мои привычки</h1>
      </div>

      {/* List */}
      <div className="space-y-3">
        {activeHabits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">✨</span>
                </div>
                <p className="text-lg font-medium">Список пуст</p>
                <p className="text-sm">Создайте свою первую привычку</p>
            </div>
        ) : (
            activeHabits.map((habit, index) => {
            const IconComponent = getIcon(habit.icon || 'target');
            const colorVar = `var(--color-habit-${habit.color || 'sapphire'})`;
            
            return (
                <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push(`/habits/edit?id=${habit.id}`)}
                    className="group relative bg-card hover:bg-accent/50 border border-border/50 rounded-2xl p-3 pr-4 flex items-center gap-4 cursor-pointer transition-colors shadow-sm"
                >
                    {/* Icon Container */}
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                        style={{ backgroundColor: colorVar }}
                    >
                        <IconComponent
                            size={22}
                            weight="fill"
                            className={cn(getTextColorForHabit(habit.color || 'sapphire'))}
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 py-1">
                        <h3 className="font-semibold text-base leading-tight truncate text-foreground">
                            {habit.name}
                        </h3>
                        {habit.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {habit.description}
                            </p>
                        )}
                        {!habit.description && (
                             <p className="text-xs text-muted-foreground mt-0.5">
                                Настроить параметры
                            </p>
                        )}
                    </div>

                    {/* Archive Button */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => handleArchiveClick(e, habit.id, habit.name)}
                        className="text-muted-foreground/50 hover:text-orange-500 transition-colors p-1 -mr-1"
                        aria-label="Архивировать привычку"
                    >
                        <Archive size={20} weight="bold" />
                    </motion.button>

                    {/* Action Indicator */}
                    <div className="text-muted-foreground/50 group-hover:text-primary transition-colors">
                        <CaretRight size={20} weight="bold" />
                    </div>
                </motion.div>
            );
            })
        )}
      </div>

      {/* FAB */}
      <FloatingActionButton />

      {/* Archive Confirmation Dialog */}
      <ArchiveHabitDialog
        open={archiveDialogState.open}
        onOpenChange={(open) => setArchiveDialogState({ ...archiveDialogState, open })}
        habitName={archiveDialogState.habitName}
        onConfirm={handleArchiveConfirm}
      />
    </div>
  );
}
