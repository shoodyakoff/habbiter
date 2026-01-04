'use client';

import { CreateHabitForm } from '@/features/habits/components/CreateHabitForm';
import { useHabitsQuery } from '@/features/habits/api/useHabits';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CaretLeft } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function EditHabitPage() {
  const params = useParams();
  const router = useRouter();
  const habitId = params.id as string;

  const { data: habits = [] } = useHabitsQuery();
  const habit = habits.find(h => h.id === habitId);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    tg.BackButton.show();
    tg.BackButton.onClick(() => router.back());

    return () => {
      tg.BackButton.hide();
      tg.BackButton.offClick();
    };
  }, [router]);

  if (!habit) {
    return <div className="p-4">Привычка не найдена</div>;
  }

  return (
    <div className="pb-24 px-4 pt-4">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <CaretLeft size={24} weight="bold" />
        </Button>
        <h1 className="text-2xl font-bold">Редактирование</h1>
      </div>

      <CreateHabitForm
        habitId={habitId}
        initialValues={habit}
        onSuccess={() => router.push('/my-habits')}
      />
    </div>
  );
}
