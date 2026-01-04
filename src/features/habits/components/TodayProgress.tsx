'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface TodayProgressProps {
  total: number;
  completed: number;
  className?: string;
}

export const TodayProgress: React.FC<TodayProgressProps> = ({ 
  total, 
  completed,
  className 
}) => {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className={cn("mb-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          Прогресс дня
        </span>
        <span className="text-sm font-bold">
          {percentage}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
};
