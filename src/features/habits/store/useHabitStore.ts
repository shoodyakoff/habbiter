import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface Habit {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status: 'active' | 'archived' | 'deleted';
  streak: number;
  archivedAt?: string;
  deletedAt?: string;
  createdAt: string;
}

export interface HabitRecord {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

interface HabitState {
  habits: Habit[];
  records: HabitRecord[];
  
  // Actions
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'status' | 'streak'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void; // soft delete
  archiveHabit: (id: string) => void;
  restoreHabit: (id: string) => void;
  permanentDeleteHabit: (id: string) => void;
  
  toggleRecord: (habitId: string, date: string) => void;
  
  // Selectors (helpers)
  getHabitsByStatus: (status: Habit['status']) => Habit[];
  getRecord: (habitId: string, date: string) => HabitRecord | undefined;
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set, get) => ({
      habits: [],
      records: [],

      addHabit: (habitData) => {
        const newHabit: Habit = {
          id: uuidv4(),
          ...habitData,
          status: 'active',
          streak: 0,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ habits: [...state.habits, newHabit] }));
      },

      updateHabit: (id, updates) => {
        set((state) => ({
          habits: state.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
        }));
      },

      deleteHabit: (id) => {
        set((state) => ({
          habits: state.habits.map((h) =>
            h.id === id
              ? { ...h, status: 'deleted', deletedAt: new Date().toISOString() }
              : h
          ),
        }));
      },

      archiveHabit: (id) => {
        set((state) => ({
          habits: state.habits.map((h) =>
            h.id === id
              ? { ...h, status: 'archived', archivedAt: new Date().toISOString() }
              : h
          ),
        }));
      },

      restoreHabit: (id) => {
        set((state) => ({
          habits: state.habits.map((h) =>
            h.id === id
              ? {
                  ...h,
                  status: 'active',
                  archivedAt: undefined,
                  deletedAt: undefined,
                }
              : h
          ),
        }));
      },

      permanentDeleteHabit: (id) => {
        set((state) => ({
          habits: state.habits.filter((h) => h.id !== id),
          records: state.records.filter((r) => r.habitId !== id),
        }));
      },

      toggleRecord: (habitId, date) => {
        set((state) => {
          const existingRecord = state.records.find(
            (r) => r.habitId === habitId && r.date === date
          );

          if (existingRecord) {
            // Toggle or remove? Spec says "Toggle".
            // If completed=true, maybe remove or set false?
            // Usually toggle means true <-> false.
            // But if I want to "uncheck", setting false is correct.
            // However, records usually store *completed* events.
            // If I just toggle boolean:
            return {
              records: state.records.map((r) =>
                r.id === existingRecord.id ? { ...r, completed: !r.completed } : r
              ),
            };
          } else {
            // Create new record
            const newRecord: HabitRecord = {
              id: uuidv4(),
              habitId,
              date,
              completed: true,
            };
            return { records: [...state.records, newRecord] };
          }
        });
      },

      getHabitsByStatus: (status) => {
        return get().habits.filter((h) => h.status === status);
      },

      getRecord: (habitId, date) => {
        return get().records.find((r) => r.habitId === habitId && r.date === date);
      },
    }),
    {
      name: 'habiter-storage',
    }
  )
);
