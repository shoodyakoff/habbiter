'use client';

import React, { useState } from 'react';
import { Plus, PencilSimple } from '@phosphor-icons/react';
import { useHabitsQuery } from '@/features/habits/api/useHabits';
import { CreateHabitForm } from '@/features/habits/components/CreateHabitForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getIcon } from '@/components/shared/Icon/IconCatalog';
import { Habit } from '@/features/habits/types/schema';

export default function MyHabitsPage() {
  const { data: habits = [], isLoading } = useHabitsQuery();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

  // Filter out deleted habits, show active and archived? Or just active?
  // User said "My Habits". Usually implies all managed habits.
  const visibleHabits = habits.filter(h => h.status !== 'deleted');

  const handleCreate = () => {
    setSelectedHabit(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (habit: Habit) => {
    setSelectedHabit(habit);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  return (
    <div className="pb-24 min-h-screen bg-background container mx-auto px-4 py-4">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Мои привычки</h1>
        <Button onClick={handleCreate} size="sm" className="gap-2">
          <Plus weight="bold" />
          Создать
        </Button>
      </header>

      <div className="grid gap-4">
        {visibleHabits.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            У вас пока нет привычек. Создайте первую!
          </div>
        ) : (
          visibleHabits.map((habit) => {
            const Icon = getIcon(habit.icon || 'check');
            return (
              <div 
                key={habit.id}
                onClick={() => handleEdit(habit)}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border shadow-sm cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <div 
                  className="flex items-center justify-center w-12 h-12 rounded-full shrink-0"
                  style={{ backgroundColor: habit.color || '#6366F1' }}
                >
                  <Icon size={24} className="text-white" weight="fill" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{habit.name}</h3>
                  {habit.description && (
                    <p className="text-sm text-muted-foreground truncate">{habit.description}</p>
                  )}
                </div>

                <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
                  <PencilSimple size={20} />
                </Button>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedHabit ? 'Редактировать привычку' : 'Создать привычку'}</DialogTitle>
          </DialogHeader>
          <CreateHabitForm 
            habitId={selectedHabit?.id}
            initialValues={selectedHabit ? {
              name: selectedHabit.name,
              description: selectedHabit.description,
              color: selectedHabit.color,
              icon: selectedHabit.icon,
            } : undefined}
            onSuccess={() => setIsDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
