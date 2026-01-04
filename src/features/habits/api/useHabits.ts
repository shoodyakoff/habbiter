import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Habit, HabitRecord } from '../types/schema';
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        trackNotes: h.track_notes,
        trackWeight: h.track_weight,
        trackVolume: h.track_volume,
        trackCount: h.track_count,
        trackDuration: h.track_duration,
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
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((r: any) => ({
        id: r.id,
        habitId: r.habit_id,
        date: r.date,
        completed: r.completed,
        note: r.note,
        valueWeight: r.value_weight,
        valueVolume: r.value_volume,
        valueCount: r.value_count,
        valueDuration: r.value_duration,
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
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((r: any) => ({
        id: r.id,
        habitId: r.habit_id,
        date: r.date,
        completed: r.completed,
        note: r.note,
        valueWeight: r.value_weight,
        valueVolume: r.value_volume,
        valueCount: r.value_count,
        valueDuration: r.value_duration,
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
          status: 'active',
          track_notes: habit.trackNotes,
          track_weight: habit.trackWeight,
          track_volume: habit.trackVolume,
          track_count: habit.trackCount,
          track_duration: habit.trackDuration
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
        trackNotes: data.track_notes,
        trackWeight: data.track_weight,
        trackVolume: data.track_volume,
        trackCount: data.track_count,
        trackDuration: data.track_duration,
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
            track_notes: updates.trackNotes,
            track_weight: updates.trackWeight,
            track_volume: updates.trackVolume,
            track_count: updates.trackCount,
            track_duration: updates.trackDuration,
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
        .maybeSingle();
        
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

  const updateHabitRecord = useMutation({
    mutationFn: async ({ id, date, ...updates }: { id: string; date: string } & Partial<HabitRecord>) => {
      if (!user) throw new Error('User not authenticated');
      
      // Check if record exists
      const { data: existing } = await supabase
        .from('habit_records')
        .select('*')
        .eq('habit_id', id)
        .eq('date', date)
        .maybeSingle();
        
      if (existing) {
        // Update
        const { error } = await supabase
          .from('habit_records')
          .update({
             note: updates.note,
             value_weight: updates.valueWeight,
             value_volume: updates.valueVolume,
             value_count: updates.valueCount,
             value_duration: updates.valueDuration,
             ...(updates.completed !== undefined ? { completed: updates.completed } : {})
          })
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
            completed: updates.completed !== undefined ? updates.completed : true,
            note: updates.note,
            value_weight: updates.valueWeight,
            value_volume: updates.valueVolume,
            value_count: updates.valueCount,
            value_duration: updates.valueDuration,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, { date }) => {
      queryClient.invalidateQueries({ queryKey: habitKeys.records(date) });
      queryClient.invalidateQueries({ queryKey: ['habits', 'week-records'] });
    },
  });

  const deleteHabit = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('habits')
        .update({ status: 'deleted', deleted_at: new Date().toISOString() })
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
    deleteHabit,
    updateHabitRecord,
  };
};
