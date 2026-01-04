'use client';

import React from 'react';
import { Plus } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface FloatingActionButtonProps {
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ className }) => {
  const router = useRouter();

  return (
    <motion.button
      onClick={() => router.push('/habits/new')}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={cn(
        "fixed bottom-24 right-4 z-40", // Changed from left-1/2 to right-4
        "w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40",
        "flex items-center justify-center",
        className
      )}
    >
      <Plus size={24} weight="bold" />
    </motion.button>
  );
};
