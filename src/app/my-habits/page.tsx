'use client';

import { useHabitsQuery, useHabitMutations } from '@/features/habits/api/useHabits';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Archive, Icon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getTextColorForHabit } from '@/lib/colors';
import { getIcon } from '@/components/shared/Icon/IconCatalog';

export default function MyHabitsPage() {
  const router = useRouter();
  const { data: habits = [], isLoading } = useHabitsQuery();
  const { archiveHabit } = useHabitMutations();
  
  const activeHabits = habits.filter(h => h.status === 'active');

  const handleArchive = (id: string) => {
    if (confirm('Архивировать привычку?')) {
        archiveHabit.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  return (
    <div className="pb-24 px-4 pt-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Мои привычки</h1>
        <Button
          onClick={() => router.push('/habits/new')}
          size="default"
        >
          <Plus size={20} weight="bold" className="mr-2" />
          Создать
        </Button>
      </div>

      <div className="space-y-3">
        {activeHabits.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
                Нет активных привычек
            </div>
        ) : (
            activeHabits.map((habit, index) => {
            const IconComponent = getIcon(habit.icon || 'target');
            
            return (
                <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
                >
                    {/* Icon */}
                    <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `var(--color-habit-${habit.color || 'sapphire'})` }}
                    >
                    <IconComponent size={24} weight="fill" className={getTextColorForHabit(habit.color || 'sapphire')} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{habit.name}</h3>
                    {habit.description && (
                        <p className="text-sm text-muted-foreground truncate">{habit.description}</p>
                    )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => router.push(`/habits/edit?id=${habit.id}`)}
                    >
                        <Pencil size={18} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleArchive(habit.id)}
                    >
                        <Archive size={18} />
                    </Button>
                    </div>
                </motion.div>
            );
            })
        )}
      </div>
    </div>
  );
}
