import { z } from 'zod';

export const HabitStatusSchema = z.enum(['active', 'archived', 'deleted']);

export const HabitSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format").optional(),
  icon: z.string().optional(),
  frequency: z.enum(['daily', 'specific_days', 'custom']).default('daily'),
  repeatDays: z.array(z.number()).optional(),
  status: HabitStatusSchema,
  streak: z.number().int().nonnegative().default(0),
  archivedAt: z.string().datetime().optional(),
  deletedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  
  // Tracking configuration
  trackNotes: z.boolean().default(false),
  trackWeight: z.boolean().default(false),
  trackVolume: z.boolean().default(false),
  trackCount: z.boolean().default(false),
  trackDuration: z.boolean().default(false),
});

export const HabitRecordSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  completed: z.boolean(),
  
  // Tracking values
  note: z.string().optional(),
  valueWeight: z.number().int().optional(),
  valueVolume: z.number().int().optional(),
  valueCount: z.number().int().optional(),
  valueDuration: z.number().int().optional(),
});

export const HabitListResponseSchema = z.object({
  items: z.array(HabitSchema),
  total: z.number(),
});

export type Habit = z.infer<typeof HabitSchema>;
export type HabitRecord = z.infer<typeof HabitRecordSchema>;
export type HabitStatus = z.infer<typeof HabitStatusSchema>;
