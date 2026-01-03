import { useHabitStore } from '../store/useHabitStore';
import { useState, useEffect } from 'react';
import { Habit } from '../types/schema';

// This hook simulates a React Query hook wrapping the Zustand store
export const useHabitsQuery = () => {
  const store = useHabitStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Return formatted data structure matching API response
  return {
    data: mounted ? store.habits : [],
    isLoading: !mounted,
    isError: false,
    refetch: () => {}, // no-op for local store
  };
};

export const useHabitRecordsQuery = (date: string) => {
  const store = useHabitStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const records = mounted 
    ? store.records.filter(r => r.date === date)
    : [];

  return {
    data: records,
    isLoading: !mounted,
  };
};

export const useWeekRecordsQuery = (dates: string[]) => {
  const store = useHabitStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const records = mounted 
    ? store.records.filter(r => dates.includes(r.date))
    : [];

  return {
    data: records,
    isLoading: !mounted,
  };
};

export const useHabitMutations = () => {
  const store = useHabitStore();
  
  return {
    toggleHabit: (id: string, date: string) => {
      store.toggleRecord(id, date);
    },
    archiveHabit: (id: string) => {
      store.archiveHabit(id);
    },
    deleteHabit: (id: string) => {
      store.deleteHabit(id);
    },
    createHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'status' | 'streak' | 'archivedAt' | 'deletedAt'>) => {
      store.addHabit(habit);
    }
  };
};
