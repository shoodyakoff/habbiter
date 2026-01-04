'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Habit, HabitRecord } from '../types/schema';
import { useHabitMutations } from '../api/useHabits';
import { Pencil, Trash, X } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getIcon } from '@/components/shared/Icon/IconCatalog';

interface HabitDetailDialogProps {
  habit: Habit | null;
  record: HabitRecord | null;
  date: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (habit: Habit) => void;
}

export const HabitDetailDialog: React.FC<HabitDetailDialogProps> = ({
  habit,
  record,
  date,
  isOpen,
  onClose,
  onEdit
}) => {
  const { updateHabitRecord, deleteHabit, toggleHabit } = useHabitMutations();
  const [note, setNote] = useState('');
  const [weight, setWeight] = useState('');
  const [volume, setVolume] = useState('');
  const [count, setCount] = useState('');
  const [duration, setDuration] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && habit) {
      setNote(record?.note || '');
      setWeight(record?.valueWeight?.toString() || '');
      setVolume(record?.valueVolume?.toString() || '');
      setCount(record?.valueCount?.toString() || '');
      setDuration(record?.valueDuration?.toString() || '');
      setIsDeleting(false);
    }
  }, [isOpen, habit, record]);

  if (!habit) return null;

  const handleSave = () => {
    updateHabitRecord.mutate({
      id: habit.id,
      date: date,
      note: note,
      valueWeight: weight ? parseInt(weight) : undefined,
      valueVolume: volume ? parseInt(volume) : undefined,
      valueCount: count ? parseInt(count) : undefined,
      valueDuration: duration ? parseInt(duration) : undefined,
      completed: true
    });
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Вы уверены, что хотите удалить привычку? Она исчезнет из статистики.')) {
        deleteHabit.mutate(habit.id);
        onClose();
    }
  };

  const handleToggleCompletion = () => {
      toggleHabit.mutate({ id: habit.id, date });
  };

  const isCompleted = record?.completed || false;
  const Icon = getIcon(habit.icon || 'check');

  const hasTrackingParams = habit.trackNotes || habit.trackWeight || habit.trackVolume || habit.trackCount || habit.trackDuration;

  if (!hasTrackingParams) {
      // If there are no tracking parameters, we don't need the inputs section or the save button for inputs.
      // But we might still want to toggle completion.
      // However, the user said "If no parameters selected, edit button should not be there".
      // Since this entire dialog IS the "edit" (fill data) interface, maybe we render a simplified version 
      // OR we just hide the input fields. 
      
      // Let's assume we just show the completion toggle if opened.
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <DialogTitle className="text-xl flex items-center gap-2">
                <Icon size={24} weight="fill" className="text-primary" />
                {habit.name}
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(date), 'd MMMM yyyy', { locale: ru })}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
            {/* Status Toggle */}
            <div className="flex items-center justify-between bg-secondary/30 p-3 rounded-lg">
                <span className="font-medium">Статус выполнения</span>
                <Button 
                    variant={isCompleted ? "default" : "outline"}
                    className={isCompleted ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={handleToggleCompletion}
                >
                    {isCompleted ? "Выполнено" : "Не выполнено"}
                </Button>
            </div>

            {/* Tracking Inputs */}
            {hasTrackingParams && (
                <>
                    {habit.trackNotes && (
                        <div className="space-y-2">
                            <Label>Комментарий</Label>
                            <Textarea 
                                placeholder="Как все прошло?" 
                                value={note} 
                                onChange={(e) => setNote(e.target.value)} 
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {habit.trackWeight && (
                            <div className="space-y-2">
                                <Label>Вес (г)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0" 
                                    value={weight} 
                                    onChange={(e) => setWeight(e.target.value)} 
                                />
                            </div>
                        )}
                        {habit.trackVolume && (
                            <div className="space-y-2">
                                <Label>Объем (мл)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0" 
                                    value={volume} 
                                    onChange={(e) => setVolume(e.target.value)} 
                                />
                            </div>
                        )}
                        {habit.trackCount && (
                            <div className="space-y-2">
                                <Label>Количество (шт)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0" 
                                    value={count} 
                                    onChange={(e) => setCount(e.target.value)} 
                                />
                            </div>
                        )}
                        {habit.trackDuration && (
                            <div className="space-y-2">
                                <Label>Длительность (мин)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0" 
                                    value={duration} 
                                    onChange={(e) => setDuration(e.target.value)} 
                                />
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>

        {hasTrackingParams && (
            <DialogFooter>
              <Button onClick={handleSave} className="w-full">
                Сохранить
              </Button>
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
