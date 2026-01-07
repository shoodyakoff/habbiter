'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Archive } from '@phosphor-icons/react';

interface ArchiveHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitName: string;
  onConfirm: () => void;
}

export const ArchiveHabitDialog: React.FC<ArchiveHabitDialogProps> = ({
  open,
  onOpenChange,
  habitName,
  onConfirm,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
              <Archive size={20} weight="fill" className="text-orange-500" />
            </div>
            <DialogTitle>Архивировать привычку?</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-2">
            Вы уверены, что хотите архивировать <span className="font-semibold">{habitName}</span>?
            <br />
            <br />
            Архивированную привычку нельзя восстановить. Она исчезнет из статистики и не будет доступна для отслеживания.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            className="flex-1"
          >
            Архивировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
