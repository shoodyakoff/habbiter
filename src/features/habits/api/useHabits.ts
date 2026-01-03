import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Habit } from '../types/schema';
import { useAuth } from '@/features/auth/hooks/useAuth';

// Keys
export const habitKeys = {
  all: ['habits'] as const,
  lists: () => [...habitKeys.all, 'list'] as const,
  records: (date: string) => [...habitKeys.all, 'records', date] as const,
  weekRecords: (dates: string[]) => [...habitKeys.all, 'week-records', dates.join(',')] as const,
};

// --- Queries ---

export const useHabitsQuery = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: habitKeys.lists(),
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Map DB schema to Frontend schema if needed
      // Currently they match closely but keys are snake_case in DB
      return data.map((h: any) => ({
        id: h.id,
        name: h.name,
        description: h.description,
        icon: h.icon,
        color: h.color,
        frequency: h.frequency,
        repeatDays: h.repeat_days,
        status: h.status,
        streak: 0, // Calculated separately or via function
        createdAt: h.created_at,
        archivedAt: h.archived_at,
        deletedAt: h.deleted_at,
      })) as Habit[];
    },
    enabled: !!user,
  });
};

export const useHabitRecordsQuery = (date: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: habitKeys.records(date),
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('habit_records')
        .select('*')
        .eq('date', date);
        
      if (error) throw error;
      
      return data.map((r: any) => ({
        id: r.id,
        habitId: r.habit_id,
        date: r.date,
        completed: r.completed,
      }));
    },
    enabled: !!user,
  });
};

export const useWeekRecordsQuery = (dates: string[]) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: habitKeys.weekRecords(dates),
    queryFn: async () => {
      if (!user || dates.length === 0) return [];
      
      const { data, error } = await supabase
        .from('habit_records')
        .select('*')
        .in('date', dates);
        
      if (error) throw error;
      
      return data.map((r: any) => ({
        id: r.id,
        habitId: r.habit_id,
        date: r.date,
        completed: r.completed,
      }));
    },
    enabled: !!user && dates.length > 0,
  });
};

// --- Mutations ---

export const useHabitMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createHabit = useMutation({
    mutationFn: async (habit: Omit<Habit, 'id' | 'createdAt' | 'status' | 'streak' | 'archivedAt' | 'deletedAt'>) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: user.id,
          name: habit.name,
          description: habit.description,
          icon: habit.icon,
          color: habit.color,
          frequency: habit.frequency,
          repeat_days: habit.repeatDays,
          status: 'active'
        })
        .select()
        .single();
        
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        frequency: data.frequency,
        repeatDays: data.repeat_days,
        status: data.status,
        streak: 0,
        createdAt: data.created_at,
        archivedAt: data.archived_at,
        deletedAt: data.deleted_at,
      } as Habit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
    },
  });

  const updateHabit = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Habit> & { id: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('habits')
        .update({
            name: updates.name,
            description: updates.description,
            icon: updates.icon,
            color: updates.color,
            frequency: updates.frequency,
            repeat_days: updates.repeatDays,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
    },
  });

  const toggleHabit = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      // Check if record exists
      const { data: existing } = await supabase
        .from('habit_records')
        .select('*')
        .eq('habit_id', id)
        .eq('date', date)
        .single();
        
      if (existing) {
        // Toggle
        const { error } = await supabase
          .from('habit_records')
          .update({ completed: !existing.completed })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('habit_records')
          .insert({
            habit_id: id,
            user_id: user.id,
            date: date,
            completed: true
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, { date }) => {
      queryClient.invalidateQueries({ queryKey: habitKeys.records(date) });
      queryClient.invalidateQueries({ queryKey: habitKeys.weekRecords([]) }); // Invalidate generic week records
      // Or better, invalidate all records related keys
      queryClient.invalidateQueries({ queryKey: ['habits', 'week-records'] });
    },
  });

  const archiveHabit = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('habits')
        .update({ status: 'archived', archived_at: new Date().toISOString() })
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
    },
  });

  return {
    createHabit,
    updateHabit,
    toggleHabit,
    archiveHabit,
  };
};
