'use client';

import React from 'react';
import { Target } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onCreate: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreate }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Target size={48} weight="duotone" className="text-primary" />
      </div>
      <h2 className="text-xl font-bold mb-2 text-foreground">Создайте первую привычку</h2>
      <p className="text-muted-foreground max-w-xs mb-8">
        Начните отслеживать свои цели и формируйте полезные привычки
      </p>
      <Button onClick={onCreate} size="lg" className="rounded-full px-8">
        + Создать привычку
      </Button>
    </div>
  );
};
