'use client';

import React from 'react';
import { getGreeting } from '@/lib/date';
import { cn } from '@/lib/utils';

interface HabitsHeaderProps {
  userName?: string;
  className?: string;
}

export const HabitsHeader: React.FC<HabitsHeaderProps> = ({ 
  userName = 'Друг',
  className 
}) => {
  const greeting = getGreeting();

  return (
    <header className={cn("py-4 mb-3", className)}>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, {userName}
        </h1>
      </div>
    </header>
  );
};
