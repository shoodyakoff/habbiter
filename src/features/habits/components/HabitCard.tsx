'use client';

import React from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Check, Flame } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Habit } from '@/features/habits/types/schema';
import { getIcon } from '@/components/shared/Icon/IconCatalog';
import { triggerHaptic } from '@/lib/haptic';
import { getTextColorForHabit, getIconColorForHabit } from '@/lib/colors';

interface HabitCardProps {
  habit: Habit;
  completed: boolean;
  onToggle: (id: string) => void;
  onClick?: (habit: Habit) => void;
  className?: string;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  completed,
  onToggle,
  onClick,
  className
}) => {
  const controls = useAnimation();
  const Icon = getIcon(habit.icon || 'check');
  const iconElement = React.createElement(Icon, { size: 24, weight: 'fill' });

  // Determine text and icon colors based on background luminance (WCAG 2.0)
  const textColorClass = getTextColorForHabit(habit.color || 'sapphire');
  const iconColorHex = getIconColorForHabit(habit.color || 'sapphire');
  const isLightBg = textColorClass === 'text-black';

  // Checkbox variants
  const checkboxVariants = {
    unchecked: { scale: 1, backgroundColor: 'transparent' },
    checked: { scale: 1, backgroundColor: iconColorHex }
  };

  const checkmarkVariants = {
    unchecked: { pathLength: 0, opacity: 0 },
    checked: { pathLength: 1, opacity: 1 }
  };

  const hasTrackingParams = habit.trackNotes || habit.trackWeight || habit.trackVolume || habit.trackCount || habit.trackDuration;

  const handleInteraction = () => {
    if (hasTrackingParams) {
      if (completed) {
        // If completed, toggle off (deactivate)
        triggerHaptic();
        onToggle(habit.id);
      } else {
        // If incomplete, open popup
        onClick?.(habit);
      }
    } else {
      // Standard toggle
      triggerHaptic();
      onToggle(habit.id);
    }
  };

  return (
    <div className={cn("relative group touch-pan-y", className)}>
      {/* Card Content */}
      <motion.div
        animate={controls}
        whileTap={{ scale: 0.98 }}
        onClick={handleInteraction}
        className={cn(
          "relative h-28 rounded-2xl p-4 flex flex-col justify-between shadow-sm cursor-pointer z-10",
          // Fallback background if CSS variable fails
          "bg-card"
        )}
        style={{ backgroundColor: `var(--color-habit-${habit.color || 'sapphire'})` }}
      >
        {/* Header: Icon + Checkbox */}
        <div className="flex justify-between items-start">
          <div className={cn("p-0", textColorClass)}>
            {iconElement}
          </div>

          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              handleInteraction();
            }}
            initial={completed ? "checked" : "unchecked"}
            animate={completed ? "checked" : "unchecked"}
            variants={checkboxVariants}
            className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors",
              isLightBg ? "border-black/20" : "border-white/40"
            )}
          >
            <motion.div variants={checkmarkVariants} transition={{ duration: 0.2 }}>
              <Check size={16} weight="bold" className={isLightBg ? "text-white" : "text-black"} />
            </motion.div>
          </motion.button>
        </div>

        {/* Footer: Name + Streak */}
        <div className="mt-auto">
          <h3 className={cn("font-semibold text-base leading-tight line-clamp-2", textColorClass)}>
            {habit.name}
          </h3>
          {habit.description && (
            <p className={cn("text-[10px] opacity-80 mt-1 line-clamp-1", textColorClass)}>
              {habit.description}
            </p>
          )}
          
          {habit.streak > 0 && (
            <div className={cn(
              "inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-md bg-black/10 backdrop-blur-sm",
              textColorClass
            )}>
              <Flame size={14} weight="fill" className={isLightBg ? "text-red-600" : "text-orange-300"} />
              <span className="text-xs font-medium">{habit.streak} дн</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
