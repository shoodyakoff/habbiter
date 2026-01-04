'use client';

import { CreateHabitForm } from '@/features/habits/components/CreateHabitForm';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CaretLeft } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function NewHabitPage() {
  const router = useRouter();

  // Telegram Back Button
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
        <h1 className="text-2xl font-bold">Новая привычка</h1>
      </div>

      <CreateHabitForm
        onSuccess={() => router.push('/my-habits')}
      />
    </div>
  );
}
