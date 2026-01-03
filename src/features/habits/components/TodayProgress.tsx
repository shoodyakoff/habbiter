'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Barbell, Rocket, Star, Fire, Target, Trophy } from '@phosphor-icons/react';

interface TodayProgressProps {
  total: number;
  completed: number;
  className?: string;
}

const getMotivation = (percent: number) => {
  if (percent === 0) return { phrase: "Начнём!", Icon: Barbell };
  if (percent <= 25) return { phrase: "Хорошее начало!", Icon: Rocket };
  if (percent <= 50) return { phrase: "Отличное начало!", Icon: Star };
  if (percent <= 75) return { phrase: "Почти готово!", Icon: Fire };
  if (percent < 100) return { phrase: "Невероятный прогресс!", Icon: Target };
  return { phrase: "Идеальный день!", Icon: Trophy };
};

const getProgressColor = (percent: number) => {
  if (percent <= 33) return "bg-habit-red";
  if (percent <= 66) return "bg-habit-orange";
  return "bg-habit-green";
};

export const TodayProgress: React.FC<TodayProgressProps> = ({ 
  total, 
  completed,
  className 
}) => {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  const { phrase, Icon } = getMotivation(percentage);
  const progressColor = getProgressColor(percentage);

  // Helper for pluralization (Russian)
  const getHabitWord = (count: number) => {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'привычек';
    if (lastDigit === 1) return 'привычка';
    if (lastDigit >= 2 && lastDigit <= 4) return 'привычки';
    return 'привычек';
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-4 mb-4",
      "bg-secondary/40 border border-border/50",
      className
    )}>
      <div className="flex flex-col gap-2 relative z-10">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Icon size={24} weight="fill" className="text-primary" />
              {phrase}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {completed} из {total} {getHabitWord(total)} выполнено
            </p>
          </div>
          <div className={cn("text-xl font-bold transition-colors", 
            percentage <= 33 ? "text-habit-red" : 
            percentage <= 66 ? "text-habit-orange" : "text-habit-green"
          )}>
            {percentage}%
          </div>
        </div>

        <div className="h-3 w-full bg-secondary rounded-full overflow-hidden mt-2">
          <motion.div 
            className={cn("h-full rounded-full shadow-sm", progressColor)}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
};
