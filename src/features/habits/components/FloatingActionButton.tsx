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
    <div className="fixed bottom-0 left-0 right-0 z-[60] pointer-events-none flex justify-center pb-24">
      <div className="w-full max-w-md relative px-4">
        <motion.button
          onClick={() => router.push('/habits/new')}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className={cn(
            "absolute bottom-0 right-4 pointer-events-auto",
            "w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40",
            "flex items-center justify-center",
            className
          )}
        >
          <Plus size={24} weight="bold" />
        </motion.button>
      </div>
    </div>
  );
};
