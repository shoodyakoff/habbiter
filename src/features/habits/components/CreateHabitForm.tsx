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
import { cn } from '@/lib/utils';
import { Loader2, AlertTriangle, Check } from 'lucide-react';

const COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Green
  '#14B8A6', // Teal
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#6B7280', // Gray
];

const createHabitSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(100),
  description: z.string().optional(),
  color: z.string().optional(),
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
}

export const CreateHabitForm = ({ onSuccess, initialValues, habitId }: CreateHabitFormProps) => {
  const router = useRouter();
  const { createHabit, updateHabit } = useHabitMutations();

  const form = useForm({
    resolver: zodResolver(createHabitSchema),
    defaultValues: {
      name: initialValues?.name || '',
      description: initialValues?.description || '',
      color: initialValues?.color || COLORS[6], // Indigo default
      icon: initialValues?.icon || 'check',
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
                frequency: 'daily', // Default
                repeatDays: [1, 2, 3, 4, 5, 6, 7], // Default
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
        // Maybe show toast
    }
  };

  const isSubmitting = createHabit.isPending || updateHabit.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">
        
        {habitId && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 p-4 rounded-lg flex gap-3">
                <AlertTriangle className="text-yellow-600 dark:text-yellow-500 shrink-0" size={20} />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Изменение названия или цвета обновит отображение привычки за весь период статистики.
                </p>
            </div>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название</FormLabel>
              <FormControl>
                <Input placeholder="Например, Медитация" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Описание (опционально)</FormLabel>
              <FormControl>
                <Textarea placeholder="10 минут утром..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
            <h3 className="text-sm font-medium">Параметры отслеживания</h3>
            <div className="grid gap-4 bg-card p-4 rounded-xl border">
                <FormField
                    control={form.control}
                    name="trackNotes"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    Комментарии
                                </FormLabel>
                                <FormDescription>
                                    Заметки к каждому выполнению
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                />
                
                <FormField
                    control={form.control}
                    name="trackWeight"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    Вес (г)
                                </FormLabel>
                            </div>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="trackVolume"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    Объем (мл)
                                </FormLabel>
                            </div>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="trackCount"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    Количество (шт)
                                </FormLabel>
                            </div>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="trackDuration"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    Длительность (мин)
                                </FormLabel>
                            </div>
                        </FormItem>
                    )}
                />
            </div>
        </div>

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Цвет</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center",
                        field.value === color ? "border-foreground scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => field.onChange(color)}
                    >
                      {field.value === color && <Check className="text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Иконка</FormLabel>
              <FormControl>
                <div className="grid grid-cols-5 gap-3">
                  {Object.entries(ICON_CATALOG).map(([name, Icon]) => (
                    <button
                      key={name}
                      type="button"
                      className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-xl border-2 transition-all",
                        field.value === name 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      )}
                      onClick={() => field.onChange(name)}
                    >
                      <Icon size={24} weight={field.value === name ? "fill" : "regular"} />
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {habitId ? 'Сохранить изменения' : 'Создать привычку'}
        </Button>
      </form>
    </Form>
  );
};
