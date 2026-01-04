'use client';

import React from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { Archive, Check, Flame } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Habit } from '@/features/habits/types/schema';
import { getIcon } from '@/components/shared/Icon/IconCatalog';
import { triggerHaptic } from '@/lib/haptic';

interface HabitCardProps {
  habit: Habit;
  completed: boolean;
  onToggle: (id: string) => void;
  onArchive: (id: string) => void;
  onClick?: (habit: Habit) => void;
  className?: string;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  completed,
  onToggle,
  onArchive,
  onClick,
  className
}) => {
  const controls = useAnimation();
  const Icon = getIcon(habit.icon || 'check');
  const iconElement = React.createElement(Icon, { size: 24, weight: 'fill' });
  
  // Swipe logic
  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -100) {
      // Swipe left -> Archive
      triggerHaptic();
      onArchive(habit.id);
    } else if (info.offset.x > 100) {
      // Swipe right -> Toggle
      triggerHaptic();
      onToggle(habit.id);
      controls.start({ x: 0 });
    } else {
      // Reset position
      controls.start({ x: 0 });
    }
  };

  // Determine text color based on background brightness (simplified)
  // For now, assume habit colors are "bright" enough for black text or dark enough for white?
  // Spec says: "If background light -> black icon/text".
  // Most habit colors (Yellow, Orange, Lime, Cyan) are light.
  // Red, Purple, Indigo, Blue, Green, Teal might be dark.
  // For MVP, let's use a helper or simple logic. 
  // Let's assume white text for darker colors and black for lighter.
  // List of "light" colors: yellow, orange, lime, cyan, teal.
  // Others: white text.
  
  // Actually, let's just stick to a safe default (Dark text on light cards? No, spec says "Color of habit").
  // Spec: "Background: Habit Color".
  // Spec: "Text: Black on light, White on dark".
  
  // Map color names to whether they are light.
  const isLightColor = ['#FCD34D', '#FB923C', '#84CC16', '#06B6D4', '#14B8A6'].includes(habit.color || '');
  // Since we use hex in DB but mapped to variables, this is tricky if we don't know the exact hex or name.
  // The schema says `color` is hex.
  // Let's assume standard Tailwind colors mapped.
  
  const textColorClass = isLightColor ? 'text-black' : 'text-white';
  const iconColorClass = isLightColor ? 'text-black' : 'text-white';
  
  // Checkbox variants
  const checkboxVariants = {
    unchecked: { scale: 1, backgroundColor: 'transparent' },
    checked: { scale: 1, backgroundColor: isLightColor ? '#000' : '#fff' }
  };
  
  const checkmarkVariants = {
    unchecked: { pathLength: 0, opacity: 0 },
    checked: { pathLength: 1, opacity: 1 }
  };

  const hasTrackingParams = habit.trackNotes || habit.trackWeight || habit.trackVolume || habit.trackCount || habit.trackDuration;

  return (
    <div className={cn("relative group touch-pan-y", className)}>
      {/* Background Action (Archive - Left) */}
      <div className="absolute inset-y-0 right-0 w-1/2 bg-red-500/80 rounded-r-2xl flex items-center justify-end px-6 z-0">
        <Archive size={24} color="white" />
      </div>

      {/* Background Action (Check - Right) */}
      <div className="absolute inset-y-0 left-0 w-1/2 bg-green-500/80 rounded-l-2xl flex items-center justify-start px-6 z-0">
        <Check size={24} color="white" />
      </div>

      {/* Card Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.7, right: 0.7 }}
        onDragEnd={handleDragEnd}
        animate={controls}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          if (hasTrackingParams) {
            onClick?.(habit);
          } else {
             // If no tracking params, clicking the card just toggles? 
             // Or does nothing?
             // Usually clicking the card opens details.
             // If we want "edit button should not be there", maybe we just don't open details?
             // Let's assume we treat the card click as "open details".
             // If no details to fill, maybe just toggle?
             triggerHaptic();
             onToggle(habit.id);
          }
        }}
        className={cn(
          "relative h-28 rounded-2xl p-4 flex flex-col justify-between shadow-sm cursor-pointer",
          // If habit.color is a hex, we use style. If it's a class name, use class.
          // Schema says Hex.
        )}
        style={{ backgroundColor: habit.color || '#6366F1' }}
      >
        {/* Header: Icon + Checkbox */}
        <div className="flex justify-between items-start">
          <div className={cn("p-0", iconColorClass)}>
            {iconElement}
          </div>
          
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic();
              onToggle(habit.id);
            }}
            initial={completed ? "checked" : "unchecked"}
            animate={completed ? "checked" : "unchecked"}
            variants={checkboxVariants}
            className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors",
              isLightColor ? "border-black/20" : "border-white/40"
            )}
          >
            <motion.div variants={checkmarkVariants} transition={{ duration: 0.2 }}>
              <Check size={16} weight="bold" className={isLightColor ? "text-white" : "text-black"} />
            </motion.div>
          </motion.button>
        </div>

        {/* Footer: Name + Streak */}
        <div className="mt-auto">
          <h3 className={cn("font-semibold text-lg leading-tight line-clamp-2", textColorClass)}>
            {habit.name}
          </h3>
          {habit.description && (
            <p className={cn("text-xs opacity-80 mt-1 line-clamp-1", textColorClass)}>
              {habit.description}
            </p>
          )}
          
          {habit.streak > 0 && (
            <div className={cn(
              "inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-md bg-black/10 backdrop-blur-sm",
              textColorClass
            )}>
              <Flame size={14} weight="fill" className={isLightColor ? "text-red-600" : "text-orange-300"} />
              <span className="text-xs font-medium">{habit.streak} дн</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
