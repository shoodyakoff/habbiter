import { CreateHabitForm } from '@/features/habits/components/CreateHabitForm';

export default function CreatePage() {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Новая привычка</h1>
      <CreateHabitForm />
    </div>
  );
}
