'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useHabitMutations } from '../api/useHabits';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ICON_CATALOG } from '@/components/shared/Icon/IconCatalog';
import { HABIT_COLORS, HabitColorSchema } from '@/features/habits/types/schema';
import { cn } from '@/lib/utils';
import { Check } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const createHabitSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(100),
  description: z.string().optional(),
  color: HabitColorSchema.optional(),
  icon: z.string().optional(),

  // Tracking
  trackNotes: z.boolean().default(false),
  trackWeight: z.boolean().default(false),
  trackVolume: z.boolean().default(false),
  trackCount: z.boolean().default(false),
  trackDuration: z.boolean().default(false),
});

type FormValues = z.infer<typeof createHabitSchema>;

interface CreateHabitFormProps {
  onSuccess?: () => void;
  initialValues?: Partial<FormValues>;
  habitId?: string;
  className?: string;
}

export const CreateHabitForm = ({ onSuccess, initialValues, habitId, className }: CreateHabitFormProps) => {
  const router = useRouter();
  const { createHabit, updateHabit } = useHabitMutations();

  const form = useForm({
    resolver: zodResolver(createHabitSchema),
    defaultValues: {
      name: initialValues?.name || '',
      description: initialValues?.description || '',
      color: initialValues?.color || 'sapphire',
      icon: initialValues?.icon || 'target',
      trackNotes: initialValues?.trackNotes || false,
      trackWeight: initialValues?.trackWeight || false,
      trackVolume: initialValues?.trackVolume || false,
      trackCount: initialValues?.trackCount || false,
      trackDuration: initialValues?.trackDuration || false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
        if (habitId) {
            await updateHabit.mutateAsync({
                id: habitId,
                name: data.name,
                description: data.description,
                color: data.color,
                icon: data.icon,
                trackNotes: data.trackNotes,
                trackWeight: data.trackWeight,
                trackVolume: data.trackVolume,
                trackCount: data.trackCount,
                trackDuration: data.trackDuration,
            });
        } else {
            await createHabit.mutateAsync({
                name: data.name,
                description: data.description,
                color: data.color,
                icon: data.icon,
                frequency: 'daily',
                repeatDays: [1, 2, 3, 4, 5, 6, 7],
                trackNotes: data.trackNotes,
                trackWeight: data.trackWeight,
                trackVolume: data.trackVolume,
                trackCount: data.trackCount,
                trackDuration: data.trackDuration,
            });
        }

        if (onSuccess) {
            onSuccess();
        } else {
            router.push('/');
            router.refresh();
        }
    } catch (error) {
        console.error('Failed to save habit', error);
    }
  };

  const isSubmitting = createHabit.isPending || updateHabit.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-8 pb-32", className)}>
        
        {/* Name Input */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-base font-semibold">Название</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Например, Медитация" 
                  {...field} 
                  className="h-12 text-lg bg-white dark:bg-card border-border/40 focus:border-primary/50 transition-colors shadow-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Icon Picker */}
        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem className="space-y-4 pt-2">
              <FormLabel className="text-base font-semibold">Иконка</FormLabel>
              <FormControl>
                <div className="grid grid-cols-6 gap-3">
                  {Object.entries(ICON_CATALOG).map(([name, Icon]) => (
                    <motion.button
                      key={name}
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      className={cn(
                        "aspect-square rounded-2xl flex items-center justify-center transition-all",
                        field.value === name 
                          ? "bg-primary text-primary-foreground shadow-md" 
                          : "bg-white dark:bg-card text-muted-foreground hover:bg-muted border border-border/40 shadow-sm"
                      )}
                      onClick={() => field.onChange(name)}
                    >
                      <Icon size={24} weight={field.value === name ? "fill" : "regular"} />
                    </motion.button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description Input */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <div className="space-y-0.5">
                  <FormLabel className="text-base font-semibold">Описание</FormLabel>
                  <p className="text-xs text-muted-foreground">Не обязательно</p>
              </div>
              <FormControl>
                <Textarea 
                  placeholder="10 минут утром..." 
                  {...field} 
                  className="min-h-[100px] bg-white dark:bg-card border-border/40 focus:border-primary/50 resize-none transition-colors shadow-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tracking Options */}
        <div className="space-y-4 pt-2">
            <div className="space-y-0.5">
                <h3 className="text-base font-semibold">Параметры отслеживания</h3>
                <p className="text-xs text-muted-foreground">Не обязательно</p>
            </div>
            <div className="bg-white dark:bg-card/50 rounded-2xl border border-border/40 overflow-hidden divide-y divide-border/30 shadow-sm">
                {[
                  // Removed trackNotes
                  { name: 'trackWeight' as const, label: 'Вес (г)' },
                  { name: 'trackVolume' as const, label: 'Объем (мл)' },
                  { name: 'trackCount' as const, label: 'Количество (шт)' },
                  { name: 'trackDuration' as const, label: 'Длительность (мин)' },
                ].map((item) => (
                  <FormField
                    key={item.name}
                    control={form.control}
                    name={item.name}
                    render={({ field }) => (
                        <FormItem className="space-y-0">
                            <label className="flex flex-row items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer w-full">
                                <div className="space-y-1">
                                    <span className="text-base font-medium">
                                        {item.label}
                                    </span>
                                </div>
                                <FormControl>
                                    <Checkbox
                                        checked={!!field.value}
                                        onCheckedChange={field.onChange}
                                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary w-6 h-6 rounded-full border-2"
                                    />
                                </FormControl>
                            </label>
                        </FormItem>
                    )}
                />
                ))}
            </div>
        </div>

        {/* Color Picker */}
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem className="space-y-4 pt-2">
              <FormLabel className="text-base font-semibold">Цвет</FormLabel>
              <FormControl>
                <div className="grid grid-cols-6 gap-3">
                  {HABIT_COLORS.map((colorName) => (
                    <motion.button
                      key={colorName}
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      className={cn(
                        "aspect-square rounded-2xl transition-all flex items-center justify-center relative overflow-hidden",
                        field.value === colorName ? "ring-2 ring-offset-2 ring-foreground shadow-sm" : "opacity-90 hover:opacity-100"
                      )}
                      style={{ backgroundColor: `var(--color-habit-${colorName})` }}
                      onClick={() => field.onChange(colorName)}
                    >
                      {field.value === colorName && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <Check size={20} weight="bold" className="text-white drop-shadow-sm" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/40 z-[100] safe-area-bottom">
           <div className="max-w-md mx-auto w-full">
            <Button 
                type="submit" 
                size="lg" 
                className="w-full text-base font-semibold h-12 rounded-xl shadow-lg shadow-primary/20"
                disabled={isSubmitting}
            >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {habitId ? 'Сохранить изменения' : 'Создать привычку'}
            </Button>
           </div>
        </div>

      </form>
    </Form>
  );
};
